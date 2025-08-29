.PHONY: help build up down logs clean restart status

help: ## Show this help message
	@echo "TransferApp Docker Management"
	@echo "============================"
	@echo ""
	@echo "Available commands:"
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

build: ## Build all Docker images
	docker-compose -f docker-compose.prod.yml build

up: ## Start all services
	docker-compose -f docker-compose.prod.yml up -d

down: ## Stop all services
	docker-compose -f docker-compose.prod.yml down

logs: ## View logs for all services
	docker-compose -f docker-compose.prod.yml logs -f

clean: ## Stop services and remove volumes (WARNING: This will delete all data)
	docker-compose -f docker-compose.prod.yml down -v
	docker system prune -f

restart: ## Restart all services
	docker-compose -f docker-compose.prod.yml restart

status: ## Show status of all services
	docker-compose -f docker-compose.prod.yml ps

dev: ## Start development environment
	docker-compose up -d

dev-down: ## Stop development environment
	docker-compose down

dev-logs: ## View development logs
	docker-compose logs -f

dev-status: ## Show development status
	docker-compose ps


