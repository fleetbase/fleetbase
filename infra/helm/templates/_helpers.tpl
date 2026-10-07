{{/*
Expand the name of the chart.
*/}}
{{- define "helm.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "helm.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "helm.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "helm.labels" -}}
helm.sh/chart: {{ include "helm.chart" . }}
{{ include "helm.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "helm.selectorLabels" -}}
app.kubernetes.io/name: {{ include "helm.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{- define "helm.commonVariables" -}}
- name: CACHE_URL
  value: tcp://redis-service.{{ .Release.Namespace }}.svc.cluster.local/1
- name: CACHE_DRIVER
  value: redis
- name: SOCKETCLUSTER_PORT
  value: "80"
- name: SOCKETCLUSTER_HOST
  value: socketcluster.{{ .Release.Namespace }}.svc.cluster.local
- name: SOCKETCLUSTER_PUBLISH_URL
  value: http://socketcluster-internal.{{ .Release.Namespace }}.svc.cluster.local:8001
{{- end }}

{{/*
Name of the Secret holding SOCKETCLUSTER_AUTH_KEY: socketcluster.existingSecret, or the one
this chart creates from socketcluster.authKey. Empty when neither is set (socket auth off,
unless the key arrives some other way, e.g. infra-provided-secret).
*/}}
{{- define "helm.socketAuthSecretName" -}}
{{- if .Values.socketcluster.existingSecret -}}
{{- .Values.socketcluster.existingSecret -}}
{{- else if .Values.socketcluster.authKey -}}
{{- include "helm.fullname" . }}-socket-auth
{{- end -}}
{{- end }}

{{/*
SOCKETCLUSTER_AUTH_ENABLED (socketcluster.authEnabled) and the SOCKETCLUSTER_AUTH_KEY env entry
(from the Secret above) for the API and socket containers. The key entry is left out when no
Secret is configured, so an envFrom-provided value still applies.
Not part of helm.commonVariables: the pre-install deploy hook runs before a chart-created
Secret exists, and it does not publish or authorize anything.
*/}}
{{- define "helm.socketAuthKeyEnv" -}}
{{- $secret := include "helm.socketAuthSecretName" . -}}
- name: SOCKETCLUSTER_AUTH_ENABLED
  value: {{ ternary "true" "false" (eq (toString .Values.socketcluster.authEnabled) "true") | quote }}
{{- if $secret }}
- name: SOCKETCLUSTER_AUTH_KEY
  valueFrom:
    secretKeyRef:
      name: {{ $secret }}
      key: {{ if .Values.socketcluster.existingSecret }}{{ .Values.socketcluster.existingSecretKey }}{{ else }}SOCKETCLUSTER_AUTH_KEY{{ end }}
{{- end }}
{{- end }}

{{/*
The API authorize endpoint the socket server calls: the API Service (httpd -> octane).
*/}}
{{- define "helm.socketAuthorizeUrl" -}}
{{- if .Values.socketcluster.authorizeUrl -}}
{{- .Values.socketcluster.authorizeUrl -}}
{{- else -}}
http://{{ include "helm.fullname" . }}.{{ .Release.Namespace }}.svc.cluster.local:{{ .Values.service.port }}/int/v1/socket/authorize
{{- end -}}
{{- end }}
{{/*
Create the name of the service account to use
*/}}
{{- define "helm.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "helm.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}
