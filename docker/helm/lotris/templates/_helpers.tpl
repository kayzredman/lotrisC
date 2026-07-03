{{- define "lotris.name" -}}
lotris
{{- end }}

{{- define "lotris.fullname" -}}
{{ .Release.Name }}-lotris
{{- end }}

{{- define "lotris.labels" -}}
app.kubernetes.io/name: {{ include "lotris.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
helm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version }}
{{- end }}

{{- define "lotris.selectorLabels" -}}
app.kubernetes.io/name: {{ include "lotris.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}
