#!make

format:
	npm run format

lint:
	npm run lint:fix

test:
	npm test

build:
	npm run build && npm run pack

