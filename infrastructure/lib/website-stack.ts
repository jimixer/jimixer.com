import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as targets from "aws-cdk-lib/aws-route53-targets";
import { Construct } from "constructs";
import * as path from "path";

export interface WebsiteStackProps extends cdk.StackProps {
  domainName: string;
  certificateArn: string;
}

export class WebsiteStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: WebsiteStackProps) {
    super(scope, id, props);

    const { domainName, certificateArn } = props;

    // S3 Bucket for website hosting
    const websiteBucket = new s3.Bucket(this, "WebsiteBucket", {
      bucketName: `${domainName}-website`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      autoDeleteObjects: false,
    });

    // ACM Certificate (must be in us-east-1 for CloudFront)
    const certificate = acm.Certificate.fromCertificateArn(
      this,
      "Certificate",
      certificateArn
    );

    // CloudFront Origin Access Identity
    const oai = new cloudfront.OriginAccessIdentity(this, "OAI");
    websiteBucket.grantRead(oai);

    // CloudFront Function for URL rewriting
    const urlRewriteFunction = new cloudfront.Function(
      this,
      "UrlRewriteFunction",
      {
        code: cloudfront.FunctionCode.fromFile({
          filePath: path.join(
            __dirname,
            "../cloudfront-functions/url-rewrite.js"
          ),
        }),
        comment: "Redirect URLs without trailing slash and append index.html",
      }
    );

    // Security Headers Policy
    const securityHeadersPolicy = new cloudfront.ResponseHeadersPolicy(
      this,
      "SecurityHeadersPolicy",
      {
        comment: "Security headers for jimixer.com",
        securityHeadersBehavior: {
          contentTypeOptions: { override: true },
          frameOptions: {
            frameOption: cloudfront.HeadersFrameOption.DENY,
            override: true,
          },
          referrerPolicy: {
            referrerPolicy:
              cloudfront.HeadersReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN,
            override: true,
          },
          strictTransportSecurity: {
            accessControlMaxAge: cdk.Duration.seconds(31536000),
            includeSubdomains: true,
            override: true,
          },
          xssProtection: {
            protection: true,
            modeBlock: true,
            override: true,
          },
        },
        customHeadersBehavior: {
          customHeaders: [
            {
              header: "Permissions-Policy",
              value: "camera=(), microphone=(), geolocation=()",
              override: true,
            },
          ],
        },
      }
    );

    // CloudFront Distribution
    const distribution = new cloudfront.Distribution(this, "Distribution", {
      defaultBehavior: {
        origin: new origins.S3Origin(websiteBucket, {
          originAccessIdentity: oai,
        }),
        viewerProtocolPolicy:
          cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD,
        compress: true,
        responseHeadersPolicy: securityHeadersPolicy,
        functionAssociations: [
          {
            function: urlRewriteFunction,
            eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
          },
        ],
      },
      domainNames: [domainName],
      certificate,
      defaultRootObject: "index.html",
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 404,
          responsePagePath: "/404.html",
        },
      ],
      priceClass: cloudfront.PriceClass.PRICE_CLASS_200,
    });

    // Route53 Hosted Zone (assuming it already exists)
    const hostedZone = route53.HostedZone.fromLookup(this, "HostedZone", {
      domainName,
    });

    // Route53 A Record
    new route53.ARecord(this, "AliasRecord", {
      zone: hostedZone,
      recordName: domainName,
      target: route53.RecordTarget.fromAlias(
        new targets.CloudFrontTarget(distribution)
      ),
    });

    // Outputs
    new cdk.CfnOutput(this, "BucketName", {
      value: websiteBucket.bucketName,
      description: "S3 Bucket Name",
    });

    new cdk.CfnOutput(this, "DistributionId", {
      value: distribution.distributionId,
      description: "CloudFront Distribution ID",
    });

    new cdk.CfnOutput(this, "DistributionDomainName", {
      value: distribution.distributionDomainName,
      description: "CloudFront Distribution Domain Name",
    });

    new cdk.CfnOutput(this, "WebsiteURL", {
      value: `https://${domainName}`,
      description: "Website URL",
    });
  }
}
