<?php

namespace Tests\Unit;

use App\Providers\AppServiceProvider;
use Illuminate\Database\Connection;
use Illuminate\Database\Events\QueryExecuted;
use Illuminate\Database\Events\TransactionBeginning;
use Illuminate\Database\Events\TransactionCommitting;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Log;
use Mockery;
use PDO;
use ReflectionMethod;
use ReflectionProperty;
use Tests\Concerns\InteractsWithEnvironmentFlags;
use Tests\TestCase;

/**
 * Covers the DB_TXN_TRIPWIRE_ENABLED diagnostics in AppServiceProvider.
 *
 * The tripwire exists to catch the case where Laravel's transaction counter
 * still says "1" while the MySQL session has already left the transaction — the
 * shape that made a committed write surface as "There is no active transaction".
 * The tests drive it through the events the provider listens on, with the PDO
 * faked so both sides of "is the server still in a transaction?" are reachable
 * without needing a server that has actually diverged.
 */
class AppServiceProviderTransactionTripwireTest extends TestCase
{
    use InteractsWithEnvironmentFlags;

    protected function setUp(): void
    {
        // Off for the boot parent::setUp() performs, so the provider under test
        // is the only thing listening — otherwise a local api/.env with the
        // tripwire on would attach a second, duplicate set of listeners.
        $this->setEnvironmentFlag('DB_TXN_TRIPWIRE_ENABLED', 'false');

        parent::setUp();

        $this->setEnvironmentFlag('DB_TXN_TRIPWIRE_ENABLED', 'true');

        $this->setStatic('recentStatements', []);
        $this->setStatic('divergenceReported', false);
    }

    protected function tearDown(): void
    {
        $this->restoreEnvironmentFlags();

        // Static state outlives the application instance, so it has to be reset
        // explicitly or one test's ring buffer leaks into the next.
        $this->setStatic('recentStatements', []);
        $this->setStatic('divergenceReported', false);

        parent::tearDown();
    }

    private function setStatic(string $name, mixed $value): void
    {
        $property = new ReflectionProperty(AppServiceProvider::class, $name);
        $property->setAccessible(true);
        $property->setValue(null, $value);
    }

    private function getStatic(string $name): mixed
    {
        $property = new ReflectionProperty(AppServiceProvider::class, $name);
        $property->setAccessible(true);

        return $property->getValue();
    }

    private function provider(): AppServiceProvider
    {
        return new AppServiceProvider($this->app);
    }

    private function invoke(AppServiceProvider $provider, string $method, array $args = []): mixed
    {
        $ref = new ReflectionMethod($provider, $method);
        $ref->setAccessible(true);

        return $ref->invokeArgs($provider, $args);
    }

    /**
     * A connection whose transaction level and raw PDO are both dictated by the test.
     */
    private function connection(int $transactionLevel, ?PDO $pdo, string $name = 'mysql'): Connection
    {
        $connection = Mockery::mock(Connection::class);
        $connection->shouldReceive('getName')->andReturn($name);
        $connection->shouldReceive('transactionLevel')->andReturn($transactionLevel);
        $connection->shouldReceive('getRawPdo')->andReturn($pdo);

        return $connection;
    }

    private function pdo(bool $inTransaction, mixed $connectionIdResult = '4242'): PDO
    {
        $pdo = Mockery::mock(PDO::class);
        $pdo->shouldReceive('inTransaction')->andReturn($inTransaction);

        if ($connectionIdResult instanceof \Throwable) {
            $pdo->shouldReceive('query')->andThrow($connectionIdResult);
        } else {
            $statement = Mockery::mock(\PDOStatement::class);
            $statement->shouldReceive('fetchColumn')->andReturn($connectionIdResult);
            $pdo->shouldReceive('query')->andReturn($statement);
        }

        return $pdo;
    }

    private function arm(): void
    {
        $this->invoke($this->provider(), 'configureTransactionTripwire');
    }

    public function test_it_registers_nothing_when_the_tripwire_is_disabled(): void
    {
        $this->setEnvironmentFlag('DB_TXN_TRIPWIRE_ENABLED', 'false');

        Event::fake();
        $this->arm();

        // The early return means no listener is attached, so a query event that
        // would otherwise be recorded leaves the buffer empty.
        $this->assertSame([], $this->getStatic('recentStatements'));
    }

    public function test_a_statement_inside_a_healthy_transaction_reports_nothing(): void
    {
        Log::spy();
        $this->arm();

        Event::dispatch(new QueryExecuted(
            'select * from users',
            [],
            1.0,
            $this->connection(1, $this->pdo(inTransaction: true))
        ));

        Log::shouldNotHaveReceived('error');
        $this->assertFalse($this->getStatic('divergenceReported'));
    }

    public function test_a_statement_outside_a_transaction_is_recorded_but_not_reported(): void
    {
        Log::spy();
        $this->arm();

        Event::dispatch(new QueryExecuted(
            'select  *   from  users',
            [],
            1.0,
            $this->connection(0, null)
        ));

        Log::shouldNotHaveReceived('error');
        // Whitespace is collapsed on the way into the ring buffer. Asserted by
        // containment, not equality: the listener is live for the duration of
        // the test, so the application's own queries land in the buffer too.
        $this->assertContains('select * from users', $this->getStatic('recentStatements'));
    }

    public function test_a_connection_without_a_raw_pdo_is_not_reported(): void
    {
        Log::spy();
        $this->arm();

        Event::dispatch(new QueryExecuted('select 1', [], 1.0, $this->connection(1, null)));

        Log::shouldNotHaveReceived('error');
        $this->assertFalse($this->getStatic('divergenceReported'));
    }

    public function test_it_reports_when_the_server_left_the_transaction_mid_statement(): void
    {
        Log::spy();
        $this->arm();

        Event::dispatch(new QueryExecuted(
            'insert into orders (id) values (1)',
            [],
            1.0,
            $this->connection(1, $this->pdo(inTransaction: false))
        ));

        $this->assertTrue($this->getStatic('divergenceReported'));

        Log::shouldHaveReceived('error')
            ->withArgs(function (string $message, array $context) {
                return $message === '[db:txn:divergence] transaction ended outside the Connection'
                    && $context['phase'] === 'after-statement'
                    && $context['statement'] === 'insert into orders (id) values (1)'
                    && $context['connection'] === 'mysql'
                    && $context['mysql_connection_id'] === '4242'
                    && is_array($context['recent_statements'])
                    && is_array($context['trace']);
            })
            ->once();
    }

    public function test_it_reports_at_commit_when_nothing_of_ours_caused_the_divergence(): void
    {
        Log::spy();
        $this->arm();

        Event::dispatch(new TransactionCommitting($this->connection(1, $this->pdo(inTransaction: false))));

        Log::shouldHaveReceived('error')
            ->withArgs(function (string $message, array $context) {
                return $context['phase'] === 'at-commit' && $context['statement'] === null;
            })
            ->once();
    }

    public function test_a_healthy_commit_is_not_reported(): void
    {
        Log::spy();
        $this->arm();

        Event::dispatch(new TransactionCommitting($this->connection(1, $this->pdo(inTransaction: true))));

        Log::shouldNotHaveReceived('error');
    }

    public function test_only_the_first_divergence_of_a_transaction_is_reported(): void
    {
        Log::spy();
        $this->arm();

        $connection = $this->connection(1, $this->pdo(inTransaction: false));

        Event::dispatch(new QueryExecuted('select 1', [], 1.0, $connection));
        Event::dispatch(new QueryExecuted('select 2', [], 1.0, $connection));

        // The guard exists so the CONNECTION_ID() lookup — itself a query — does
        // not re-enter the listener and log forever.
        Log::shouldHaveReceived('error')->once();
    }

    public function test_beginning_a_new_top_level_transaction_re_arms_the_report(): void
    {
        Log::spy();
        $this->arm();
        $this->setStatic('divergenceReported', true);

        Event::dispatch(new TransactionBeginning($this->connection(1, null)));

        $this->assertFalse($this->getStatic('divergenceReported'));
    }

    public function test_a_nested_transaction_does_not_re_arm_the_report(): void
    {
        Log::spy();
        $this->arm();
        $this->setStatic('divergenceReported', true);

        // A savepoint, not a new transaction: re-arming here would let one
        // physical transaction log a report per nesting level.
        Event::dispatch(new TransactionBeginning($this->connection(2, null)));

        $this->assertTrue($this->getStatic('divergenceReported'));
    }

    public function test_an_unavailable_connection_id_is_recorded_rather_than_thrown(): void
    {
        Log::spy();
        $this->arm();

        Event::dispatch(new QueryExecuted(
            'select 1',
            [],
            1.0,
            $this->connection(1, $this->pdo(
                inTransaction: false,
                connectionIdResult: new \RuntimeException('server has gone away')
            ))
        ));

        Log::shouldHaveReceived('error')
            ->withArgs(function (string $message, array $context) {
                return $context['mysql_connection_id'] === 'unavailable: server has gone away';
            })
            ->once();
    }

    public function test_a_report_without_a_pdo_records_a_null_connection_id(): void
    {
        Log::spy();

        // Not reachable through the listeners (both require a PDO to get this
        // far), so the reporting path is exercised directly.
        $this->invoke($this->provider(), 'reportTransactionDivergence', [
            $this->connection(1, null),
            'at-commit',
            null,
        ]);

        Log::shouldHaveReceived('error')
            ->withArgs(function (string $message, array $context) {
                return $context['mysql_connection_id'] === null
                    && $context['pdo_object_id'] === null;
            })
            ->once();
    }

    public function test_the_statement_ring_buffer_keeps_only_the_most_recent_entries(): void
    {
        $provider = $this->provider();

        foreach (range(1, 30) as $n) {
            $this->invoke($provider, 'recordStatement', ["select {$n}"]);
        }

        $buffer = $this->getStatic('recentStatements');

        $this->assertCount(25, $buffer);
        $this->assertSame('select 6', $buffer[0]);
        $this->assertSame('select 30', $buffer[24]);
    }

    public function test_long_statements_are_truncated_in_the_buffer(): void
    {
        $provider = $this->provider();

        $this->invoke($provider, 'recordStatement', ['select ' . str_repeat('x', 500)]);

        $buffer = $this->getStatic('recentStatements');

        $this->assertLessThanOrEqual(203, strlen($buffer[0]));
        $this->assertStringEndsWith('...', $buffer[0]);
    }

    public function test_the_application_trace_is_a_list_of_file_line_frames(): void
    {
        $trace = $this->invoke($this->provider(), 'applicationTrace');

        $this->assertIsArray($trace);
        $this->assertNotEmpty($trace);

        foreach ($trace as $frame) {
            $this->assertIsString($frame);
            $this->assertStringContainsString(':', $frame);
        }
    }
}
