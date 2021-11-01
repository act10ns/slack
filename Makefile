#!make

TEST_REGEX ?= *.ts

.DEFAULT_GOAL:=help

all:
	npm run all

## install		- Install dependencies.
install:
	npm install

## format			- Code formatter.
format:
	npm run format

## lint			- Source code linter.
lint:
	npm run lint:fix

## test			- Run unit tests.
test:
	npm test

## test.only		- Only run defined unit tests.
test.only:
	npm test -- $(TEST_REGEX)

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
