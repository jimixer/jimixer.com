#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { WebsiteStack } from "../lib/website-stack";

const app = new cdk.App();

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT || process.env.AWS_ACCOUNT_ID,
  region: process.env.CDK_DEFAULT_REGION || process.env.AWS_REGION || "ap-northeast-1",
};

new WebsiteStack(app, "JimixerComStack", {
  env,
  domainName: process.env.DOMAIN_NAME || "jimixer.com",
  certificateArn: process.env.CERTIFICATE_ARN!,
  description: "Static website hosting for jimixer.com",
});

app.synth();
