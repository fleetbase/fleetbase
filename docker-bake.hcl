// docker-bake.hcl
variable "REGISTRY" { default = "" }
variable "VERSION" { default = "latest" }
variable "CACHE" { default = "" }
variable "GCP" { default = false }
variable "GITHUB_AUTH_KEY" { default = "" }

group "default" {
  targets = ["app", "app-httpd"]
}

group "release" {
  targets = ["fleetbase-console", "fleetbase-api"]
}

target "app" {
  name = "app-${tgt}"

  // use matrix strategy to build several targets at once
  matrix = {
    tgt = ["app", "scheduler", "events"]
  }
  context = "./"
  // set the target from matrix
  target     = tgt
  dockerfile = "docker/Dockerfile"
  platforms = [
    "linux/amd64",
  ]

  tags = notequal("", REGISTRY) ? formatlist(
    GCP ? "${REGISTRY}/${tgt}:%s" : "${REGISTRY}:${tgt}-%s",
    compact(["latest", VERSION])
  ) : []

  args = {
    GITHUB_AUTH_KEY = "${GITHUB_AUTH_KEY}"
  }

  cache-from = notequal("", CACHE) ? ["${CACHE}"] : []
  cache-to   = notequal("", CACHE) ? ["${CACHE},mode=max,ignore-error=true"] : []
}

target "app-httpd" {
  context    = "./"
  dockerfile = "docker/httpd/Dockerfile"
  platforms = [
    "linux/amd64",
  ]

  tags = notequal("", REGISTRY) ? formatlist(
    GCP ? "${REGISTRY}/app-httpd:%s" : "${REGISTRY}:app-httpd-%s",
    compact(["latest", VERSION])
  ) : []
}

target "fleetbase-console" {
  context    = "./console"
  dockerfile = "Dockerfile"
  platforms  = ["linux/amd64"]

  tags = notequal("", REGISTRY) ? formatlist(
    "${REGISTRY}/fleetbase-console:%s",
    compact(["latest", VERSION])
  ) : []
}

target "fleetbase-api" {
  context    = "./"
  dockerfile = "docker/Dockerfile"
  target     = "app-release"
  platforms  = ["linux/amd64"]

  tags = notequal("", REGISTRY) ? formatlist(
    "${REGISTRY}/fleetbase-api:%s",
    compact(["latest", VERSION])
  ) : []
}