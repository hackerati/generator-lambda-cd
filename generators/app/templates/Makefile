.PHONY: install test clean build deploy

install:
	yarn install

test: install
	yarn test

clean:
	rm -rf dist/ node_modules/

build: clean
	yarn install --production
	mkdir dist/
	cp lambda.js dist/
	-cp -r node_modules dist/
	cd dist/ && zip -r generated-lambda.zip * && cd ..

deploy: test build
	terraform init -force-copy -input=false
	terraform plan
	terraform apply
