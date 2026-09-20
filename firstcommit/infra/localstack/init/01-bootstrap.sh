#!/bin/sh
set -eu
awslocal s3 mb s3://shikshamesh-local-course-content || true
awslocal events create-event-bus --name shikshamesh-audit || true
awslocal sqs create-queue --queue-name shikshamesh-quiz-notifications || true
echo "ShikshaMesh LocalStack resources ready"
