CREATE TABLE `campaigns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`stripePriceIds` json NOT NULL,
	`maxSelections` int NOT NULL DEFAULT 1,
	`isActive` boolean NOT NULL DEFAULT true,
	`termsText` text,
	`riskLimitUsd` decimal(10,2),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `campaigns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `incentiveOptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`campaignId` int NOT NULL,
	`conditionKey` varchar(128) NOT NULL,
	`conditionLabel` varchar(255) NOT NULL,
	`conditionDescription` text,
	`category` enum('market','economy','sports','custom') NOT NULL,
	`rewardValueUsd` decimal(10,2) NOT NULL,
	`rewardLabel` varchar(255),
	`resolutionWindowDays` int NOT NULL DEFAULT 30,
	`dataSource` varchar(255),
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `incentiveOptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `intents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`transactionId` int,
	`campaignId` int NOT NULL,
	`incentiveOptionId` int NOT NULL,
	`stripeSubscriptionId` varchar(128),
	`stripeCustomerId` varchar(128),
	`termsSnapshot` json,
	`status` enum('CREATED','TRACKING','PENDING_RESOLUTION','RESOLVED_WIN','RESOLVED_LOSS','CANCELLED','ERROR') NOT NULL DEFAULT 'CREATED',
	`resolveAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `intents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ledger` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`intentId` int,
	`settlementId` int,
	`eventType` varchar(64) NOT NULL,
	`amountUsd` decimal(10,2),
	`description` text,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ledger_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `resolutions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`intentId` int NOT NULL,
	`outcome` enum('WIN','LOSS') NOT NULL,
	`proofJson` json,
	`resolvedAt` timestamp NOT NULL DEFAULT (now()),
	`resolverRunId` int,
	CONSTRAINT `resolutions_id` PRIMARY KEY(`id`),
	CONSTRAINT `resolutions_intentId_unique` UNIQUE(`intentId`)
);
--> statement-breakpoint
CREATE TABLE `resolverRuns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	`status` enum('running','completed','failed') NOT NULL DEFAULT 'running',
	`intentsProcessed` int DEFAULT 0,
	`winsFound` int DEFAULT 0,
	`lossesFound` int DEFAULT 0,
	`settlementsTriggered` int DEFAULT 0,
	`errorMessage` text,
	CONSTRAINT `resolverRuns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rewardBalances` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`remainderUsd` decimal(10,2) NOT NULL DEFAULT '0',
	`monthsAwardedLast365d` decimal(5,2) NOT NULL DEFAULT '0',
	`windowStartedAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `rewardBalances_id` PRIMARY KEY(`id`),
	CONSTRAINT `rewardBalances_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `settlements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`intentId` int NOT NULL,
	`userId` int NOT NULL,
	`status` enum('PENDING','APPLIED','WIN_PENDING_ELIGIBILITY','FAILED_RETRYING','FAILED_NEEDS_REVIEW','CAP_REACHED','EXPIRED_UNCLAIMED','REVERSED') NOT NULL DEFAULT 'PENDING',
	`rewardValueUsd` decimal(10,2),
	`rewardBalanceUsdBefore` decimal(10,2) DEFAULT '0',
	`currentPlanPriceUsd` decimal(10,2),
	`monthsToDefer` int,
	`remainderBalanceUsd` decimal(10,2),
	`nextInvoiceDateBefore` timestamp,
	`nextInvoiceDateAfter` timestamp,
	`stripeSubscriptionId` varchar(128),
	`attempts` int NOT NULL DEFAULT 0,
	`lastAttemptAt` timestamp,
	`lastError` text,
	`eligibilityClaimExpiresAt` timestamp,
	`appliedAt` timestamp,
	`idempotencyKey` varchar(128),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `settlements_id` PRIMARY KEY(`id`),
	CONSTRAINT `settlements_idempotencyKey_unique` UNIQUE(`idempotencyKey`)
);
--> statement-breakpoint
ALTER TABLE `incentives` MODIFY COLUMN `transactionId` int;--> statement-breakpoint
ALTER TABLE `incentives` MODIFY COLUMN `conditionLabel` varchar(256);--> statement-breakpoint
ALTER TABLE `incentives` MODIFY COLUMN `conditionCategory` enum('market','sports','economy','custom') NOT NULL DEFAULT 'market';--> statement-breakpoint
ALTER TABLE `incentives` MODIFY COLUMN `rewardDescription` varchar(256);--> statement-breakpoint
ALTER TABLE `incentives` MODIFY COLUMN `rewardValueCents` int;