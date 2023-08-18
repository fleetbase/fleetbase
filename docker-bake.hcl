// docker-bake.hcl
variable "REGISTRY" { default = "" }
variable "VERSION" { default = "latest" }
variable "CACHE" { default = "" }

group "default" {
  targets = ["app", "app-httpd"]
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
    "${REGISTRY}:${tgt}-%s",
    compact(["latest", VERSION])
  ) : []

  secret = [
    "type=file,id=composer_auth,src=./composer-auth.json"
  ]

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
    "${REGISTRY}:app-httpd-%s",
    compact(["latest", VERSION])
  ) : []
}
