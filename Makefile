.PHONY: all image package dist clean

dockerimg=amazonlinux:nodejs

all: dist

image:
	docker build --tag $(dockerimg) .

package: image
	docker run --rm --volume ${PWD}/lambda:/build $(dockerimg) npm install --production

dist: package
	cd lambda && zip -FS -q -r ../dist/function.zip *

clean:
	rm -r lambda/node_modules
	docker rmi --force $(dockerimg)
