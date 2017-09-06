terraform {
  backend "s3" {
    bucket = "hackerati-terraform-backends"
    key    = "generated-lambda"
    region = "us-east-1"
  }
}

provider "aws" {
  region = "us-east-1"
}

resource "aws_iam_role" "generated-lambda" {
  name = "generated-lambda"
  path = "/service-role/"

  assume_role_policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": "sts:AssumeRole",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Effect": "Allow",
      "Sid": ""
    }
  ]
}
EOF
}

resource "aws_lambda_function" "generated-lambda" {
  filename         = "dist/generated-lambda.zip"
  function_name    = "generated-lambda"
  role             = "${aws_iam_role.generated-lambda.arn}"
  handler          = "lambda.handler"
  source_code_hash = "${base64sha256(file("${path.module}/dist/generated-lambda.zip"))}"
  runtime          = "nodejs6.10"
}
