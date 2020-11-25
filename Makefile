#!make

.DEFAULT_GOAL:=help

all:
	npm run all

## format			- Code formatter.
format:
	npm run format

## lint			- Source code linter.
lint:
	npm run lint:fix

## test			- Run unit tests.
test:
	npm test

## build			- Build and pack.
build:
	npm run build && npm run pack

## help			- Show this help.
help: Makefile
	@echo ''
	@echo 'Usage:'
	@echo '  make [TARGET]'
	@echo ''
	@echo 'Targets:'
	@sed -n 's/^##//p' $<
	@echo ''

	@echo 'Add project-specific env variables to .env file:'
	@echo 'PROJECT=$(PROJECT)'

.PHONY: help format lint test build all
