.PHONY: all image package dist clean copy sharp

dockerimg=amazonlinux:nodejs
nodeversion=8.10
projectdir=${PWD}
tempdir=tmp
lambdabuilddir=build

define copy_lambda
	mkdir -p $(tempdir) && cp -r lambda/* $(tempdir)/
endef

define remove_copy
	rm -rf $(tempdir)
endef

all: dist

image:
	docker build --tag $(dockerimg) --build-arg NODEVERSION=$(nodeversion) .

sharp: image
	$(call copy_lambda)
	docker run --rm --volume $(projectdir)/$(tempdir):/build $(dockerimg) npm install --production
	cd $(tempdir)/node_modules/sharp; \
	zip -FS -q -r $(projectdir)/dist/sharp_$(nodeversion).zip *
	$(call remove_copy)

build:
	$(call copy_lambda)
	cd $(tempdir); \
	npm i --only=dev; \
	BUILD_DIR=$(lambdabuilddir) node build.js; \
	cp -r $(lambdabuilddir)/* ./; \
	rm -rf $(lambdabuilddir); \
	rm -rf node_modules/*

package: sharp build
	rm -rf $(tempdir)/node_modules/sharp
	mkdir $(tempdir)/node_modules/sharp
	cd $(tempdir); \
	npm i --only=prod; \
	unzip -o $(projectdir)/dist/sharp_$(nodeversion).zip -d node_modules/sharp/; \
	zip -FS -q -r $(projectdir)/dist/function.zip *
	$(call remove_copy)

dist: package
	cd lambda && zip -FS -q -r ../dist/function.zip *

clean:
	rm -r lambda/node_modules
	$(call remove_copy)
	docker rmi --force $(dockerimg)
