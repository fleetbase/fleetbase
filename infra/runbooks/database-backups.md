# Database backups runbook (Fleetbase Cloud)

Everything in this runbook is a **proposal**. None of it has been applied: all of it changes AWS resources, which only a person with production access should do. Account `751951296428`, region `ap-southeast-1`, profile `fleetbase-oss-prod`.

## What went wrong (2026-09-24 → 2026-10-06)

The `fleetbase-db-backups` bucket held four objects, each 20 bytes, an empty gzip stream:

```
development_fleetbase_backup-20260924-000047.sql.gz           20 B
development_fleetbase_sandbox_backup-20260924-000050.sql.gz   20 B
development_fleetbase_backup-20260925-000030.sql.gz           20 B
development_fleetbase_sandbox_backup-20260925-000032.sql.gz   20 B
```

- **Writer.** The writer was core-api's `db:backup`, scheduled `daily()` by `fleetbase/internals` and run in the `scheduler` ECS service (cluster `fleetbase-production`, task definition `fleetbase-production-scheduler:217`). There are no EventBridge rules, EventBridge Scheduler schedules or backup Lambda functions.
- **Why the dumps were empty.** The image (`docker/Dockerfile`) installed `mycli` but no `mysqldump`. The command ran `mysqldump … | gzip > file` without `pipefail`. The shell reported `mysqldump: not found`, and gzip compressed empty input and exited 0. The command treated that as success and uploaded the 20-byte file.
- **Why it stopped writing.** The scheduler logs show `db:backup` still running every night after 2026-09-25 and logging `DONE`, for example `2026-09-26 00:05:33 … db:backup --no-interaction 12,915ms DONE`. Its output went to `/dev/null`. The command caught upload exceptions and printed them only in verbose mode.
  - The scheduler's task role `task-92b1ceb` has **no `s3:PutObject` on this bucket**, only `s3:ListBucket` (the inline policy `HotfixForBackups`).
  - The old config used static `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` credentials whenever `APP_ENV` was `local` or `development`. Production runs with `APP_ENV=development`, as the `development_` file prefix shows. So the two uploads that worked most likely used static keys that later stopped working.
  - **Not verified:** which keys these were and when they stopped. Reading the decrypted SSM config and IAM access-key usage was out of scope for the read-only investigation.
- **What to check in production config.** `APP_ENV=development` in production is worth a look on its own: it also changes how `Utils::consoleUrl` and other environment checks behave.

## What the code change does

There are three parts:

- **fleetbase/core-api.** `db:backup` is rewritten:
  - The dump client streams into gzip inside PHP, without a shell pipe.
  - A run fails on any of these:
    - a non-zero exit from the dump client,
    - a missing `-- Dump completed` marker,
    - a compressed dump smaller than `min_size_bytes`,
    - an uploaded object whose size differs from the local file.
  - Each run is recorded in `database_backups`. Failures can be emailed, and the command exits non-zero, so the scheduler logs `FAIL`.
  - Settings, schedule and retention are managed under **Admin → Database Backups**.
- **fleetbase/fleetbase.** Adds `default-mysql-client` to the image and adds the console admin page.
- **fleetbase/internals.** Removes the hard-coded `db:backup` daily schedule. The schedule now comes from the admin settings.

## Steps to bring production backups back

### 1. Let the task role write to the bucket

The new command uploads through the `s3` filesystem disk.

- **Credentials.** When `AWS_ACCESS_KEY_ID` is empty, the AWS SDK falls back to the task role. If production sets static keys for the media bucket, those keys need the same grant.
- **Policy.** Replace the inline `HotfixForBackups` policy with:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ListBackups",
      "Effect": "Allow",
      "Action": "s3:ListBucket",
      "Resource": "arn:aws:s3:::fleetbase-db-backups"
    },
    {
      "Sid": "WriteAndTrimBackups",
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject", "s3:AbortMultipartUpload"],
      "Resource": "arn:aws:s3:::fleetbase-db-backups/*"
    }
  ]
}
```

```bash
aws iam put-role-policy --profile fleetbase-oss-prod --role-name task-92b1ceb --policy-name DatabaseBackups --policy-document file://database-backups-policy.json
```

```bash
aws iam delete-role-policy --profile fleetbase-oss-prod --role-name task-92b1ceb --policy-name HotfixForBackups
```

The `events` service, which runs queued "Run backup now" jobs, uses the same task role. Check this with `aws ecs describe-task-definition` before relying on it.

### 2. Deploy, then enable backups

1. Deploy the release that contains all three PRs, then confirm the client is in the image:
   ```bash
   aws ecs execute-command --profile fleetbase-oss-prod --cluster fleetbase-production --task <scheduler-task-id> --container scheduler --interactive --command "mysqldump --version"
   ```
2. In the console, open **Admin → Database Backups**:
   - **Enabled:** on
   - **Frequency:** daily at 00:00 UTC
   - **Disk:** `s3`
   - **Bucket:** `fleetbase-db-backups`
   - **Path:** blank, which keeps the old key layout so retention also trims the legacy files
   - **Databases:** `mysql` and `sandbox`
   - **Retention:** 30 days
   - **Failure notifications:** on, with the on-call addresses
3. Click **Run backup now**, then **Refresh**. Both databases should show `completed` with a size in MB, not bytes.
4. Delete the four 20-byte objects by hand once a real backup exists. Retention keeps each database's newest file, so it won't remove them on its own.

## Proposal: S3 lifecycle rule

The app already trims by its own retention setting. A lifecycle rule is the backstop for when the app is down or misconfigured, and it also cleans up abandoned multipart uploads. Set its expiration a little beyond the app's retention so the two never compete:

```json
{
  "Rules": [
    {
      "ID": "expire-db-dumps",
      "Status": "Enabled",
      "Filter": { "Prefix": "" },
      "Expiration": { "Days": 35 },
      "AbortIncompleteMultipartUpload": { "DaysAfterInitiation": 1 }
    }
  ]
}
```

```bash
aws s3api put-bucket-lifecycle-configuration --profile fleetbase-oss-prod --bucket fleetbase-db-backups --lifecycle-configuration file://lifecycle.json
```

Optional hardening for the bucket:

- **Versioning.** Enable it, with a `NoncurrentVersionExpiration` of 7 days, so an accidental or malicious delete can be recovered.
- **Public access block.** Turn on all four settings.
- **Bucket policy.** Deny `s3:DeleteObject` to everyone except the backup role.

## Proposal: alarm when no new dump arrives within 26 hours

Use two independent signals, so that a broken app and a broken bucket each raise an alarm.

**A. S3 request metrics: did any PUT reach the bucket?**

```bash
aws s3api put-bucket-metrics-configuration --profile fleetbase-oss-prod --bucket fleetbase-db-backups --id all-objects --metrics-configuration '{"Id":"all-objects"}'
```

```bash
aws cloudwatch put-metric-alarm --profile fleetbase-oss-prod --region ap-southeast-1 \
  --alarm-name fleetbase-db-backups-no-new-dump \
  --alarm-description "No object written to s3://fleetbase-db-backups in 26 hours" \
  --namespace AWS/S3 --metric-name PutRequests \
  --dimensions Name=BucketName,Value=fleetbase-db-backups Name=FilterId,Value=all-objects \
  --statistic Sum --period 3600 --evaluation-periods 26 --datapoints-to-alarm 26 \
  --threshold 1 --comparison-operator LessThanThreshold \
  --treat-missing-data breaching \
  --alarm-actions arn:aws:sns:ap-southeast-1:751951296428:<ops-topic>
```

How this alarm behaves:

- **Why missing data must count as breaching.** S3 publishes no data point for an hour with no requests, and that silence is exactly the case to catch.
- **What it misses.** Request metrics count requests, not object size. Signal B and the app's own `min_size_bytes` check cover a dump that is written but tiny.

**B. Scheduler logs: did `db:backup` fail?** The scheduler now exits non-zero on failure, and go-crond logs `… db:backup … FAIL`.

```bash
aws logs put-metric-filter --profile fleetbase-oss-prod --region ap-southeast-1 \
  --log-group-name awslogs-fleetbase-production-scheduler \
  --filter-name db-backup-failed \
  --filter-pattern '"db:backup" "FAIL"' \
  --metric-transformations metricName=DatabaseBackupFailed,metricNamespace=Fleetbase,metricValue=1,defaultValue=0
```

```bash
aws cloudwatch put-metric-alarm --profile fleetbase-oss-prod --region ap-southeast-1 \
  --alarm-name fleetbase-db-backup-failed \
  --namespace Fleetbase --metric-name DatabaseBackupFailed \
  --statistic Sum --period 3600 --evaluation-periods 1 \
  --threshold 1 --comparison-operator GreaterThanOrEqualToThreshold \
  --treat-missing-data notBreaching \
  --alarm-actions arn:aws:sns:ap-southeast-1:751951296428:<ops-topic>
```

If no ops SNS topic exists yet, create one with `aws sns create-topic --name fleetbase-ops-alerts` and subscribe the on-call email.

## Alternatives and complements: AWS-native backups

Logical dumps in the same region and account protect against application-level loss, such as a bad migration or a deleted tenant. They don't protect against losing the region or the account. The options below don't depend on the app image working.

| Option | What it gives | Notes |
|---|---|---|
| Raise RDS automated backup retention to 14 to 35 days | PITR over a longer window | `aws rds modify-db-instance --db-instance-identifier fleetbase-shared --backup-retention-period 14 --apply-immediately`. Currently 7 days. |
| RDS cross-region automated backup replication | PITR restorable in a second region (e.g. `ap-southeast-2`) | `aws rds start-db-instance-automated-backups-replication --region ap-southeast-2 --source-db-instance-arn arn:aws:rds:ap-southeast-1:751951296428:db:fleetbase-shared --backup-retention-period 7`. Supported for MySQL 8.0. |
| AWS Backup plan for `fleetbase-shared` | Daily snapshots, vault lock, cross-region and cross-account copy rules, central reporting | Best if more resources (Redis, EFS) will be protected later. A copy into a separate account's vault guards against account compromise. |
| S3 Cross-Region Replication of `fleetbase-db-backups` | The logical dumps exist in a second region | Requires versioning. |

Recommended minimum: the IAM fix, both alarms, the lifecycle rule, and RDS cross-region automated backup replication.
