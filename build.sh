#!/usr/bin/env bash

# Variables we use
DOCKERIMG=amazonlinux:nodejs
NODEVERSION=8.10
PROJECTDIR=$(pwd)
TEMPDIR=tmp
LAMBDABUILDDIR=build

# Create a temp directory and operate in it
# So we don't fork anything up
mkdir -p $TEMPDIR
cd $TEMPDIR

# Copy over our existing source
cp -r ../lambda/* ./

# Only install dev dependencies
rm -rf node_modules
npm i --only=dev

# Run our builder, which transpiles flow-typed js
if BUILD_DIR=$LAMBDABUILDDIR ./build.js; then
    # If the sharp version for $NODEVERSION doesn't exist
    # Then build it (can take a bit)
    if [ ! -f $PROJECTDIR/dist/sharp_$NODEVERSION.zip ]; then
        docker build --tag $DOCKERIMG --build-arg NODEVERSION=$NODEVERSION ../
        docker run --rm --volume $PROJECTDIR/$TEMPDIR:/build $DOCKERIMG npm install --production
        cd node_modules/sharp; \
        zip -FS -q -r $PROJECTDIR/dist/sharp_$NODEVERSION.zip *
        cd $PROJECTDIR/$TEMPDIR
        docker rmi --force $DOCKERIMG
    fi

    cd $LAMBDABUILDDIR
    cp ../package.json ./

    # Install production dependencies in our lambda build
    npm i --only=prod

    # IMPORTANT: Remove old sharp that will not work
    rm -rf node_modules/sharp/*

    # Unpackage the built sharp version
    unzip -o $PROJECTDIR/dist/sharp_$NODEVERSION.zip -d node_modules/sharp/

    # Zip lambda function
    zip -FS -q -r $PROJECTDIR/dist/function.zip *

    # clean up
    cd $PROJECTDIR
    rm -rf $TEMPDIR
fi
