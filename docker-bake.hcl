// docker-bake.hcl
variable "REGISTRY" { default = "" }
variable "tags" { default = "[]" }
target "docker-metadata-action" {}

group "default" {
  targets = ["app", "app-httpd", "socketcluster"]
}

target "app" {
  name = "app-${tgt}"

  // here we inherit from docker-metadata-action to get
  // labels for the image
  // Labels are used to connect the built packages to the repository.
  inherits = ["docker-metadata-action"]

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
    "${REGISTRY}/fleetbase-${tgt}:%s",
    // some magic happens here:
    // We replace "willbereplaced:" with "" to get rid of the fake image
    // then we decode the json object passed as a string into a list of tags
    // then we concat that with "latest"
    // So in the end we'll get something like ["latest". "1.0". "1.0.0"]
    // Then formatlist will prepend the registry and image name to each of
    // the tags
    concat(["latest"], jsondecode(replace(tags, "willbereplaced:", "")))
  ) : []
}

target "app-httpd" {
  inherits = ["docker-metadata-action"]

  context    = "./"
  dockerfile = "docker/httpd/Dockerfile"
  platforms = [
    "linux/amd64",
  ]

  tags = notequal("", REGISTRY) ? formatlist(
    "${REGISTRY}/fleetbase-app-httpd:%s",
    concat(["latest"], jsondecode(replace(tags, "willbereplaced:", "")))
  ) : []
}
target "socketcluster" {
  inherits = ["docker-metadata-action"]

  context    = "./"
  dockerfile = "socket/Dockerfile"
  platforms = [
    "linux/amd64",
  ]

  tags = notequal("", REGISTRY) ? formatlist(
    "${REGISTRY}/fleetbase-socketcluster:%s",
    concat(["latest"], jsondecode(replace(tags, "willbereplaced:", "")))
  ) : []
}
