'use strict';
// @flow

declare type S3Object = {
    key: string,
    size: Number,
    eTag: string,
    versionId: string,
};

declare type S3EventRecord = {
    eventVersion: string,
    eventSource: string,
    awsRegion: string,
    eventTime: Date,
    eventName: string,
    userIdentity: {
        principalId: string,
    },
    requestParameters: {
        sourceIPAddress: string,
    },
    responseElements: {
        'x-amz-request-id': string,
        'x-amz-id-2': string,
    },
    s3: {
        s3SchemaVersion: string,
        configurationId: string,
        bucket: {
            name: string,
            ownerIdentity: {
                principalId: string,
            },
            arn: string,
        },
        object: S3Object,
    },
};

declare type S3Event = {
    Records: Array<S3EventRecord>,
};

delcare type S3Tag = {
    Key: string,
    Value: string,
}

declare type S3Tagging = {
    TagSet: Array<S3Tag>,
    VersionId: string
}
