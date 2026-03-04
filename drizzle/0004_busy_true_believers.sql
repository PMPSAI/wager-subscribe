CREATE TABLE `embedTokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`merchantId` int NOT NULL,
	`userId` int NOT NULL,
	`token` varchar(256) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`revoked` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `embedTokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `embedTokens_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `merchants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`slug` varchar(128) NOT NULL,
	`stripeAccountId` varchar(128),
	`stripeAccessToken` text,
	`stripeRefreshToken` text,
	`stripePublishableKey` varchar(128),
	`stripeWebhookEndpointId` varchar(128),
	`stripeWebhookSecret` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `merchants_id` PRIMARY KEY(`id`),
	CONSTRAINT `merchants_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `webhookEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`stripeEventId` varchar(128) NOT NULL,
	`eventType` varchar(128) NOT NULL,
	`signatureValid` boolean NOT NULL DEFAULT false,
	`status` enum('processed','invalid','test','error') NOT NULL,
	`payload` json,
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `webhookEvents_id` PRIMARY KEY(`id`),
	CONSTRAINT `webhookEvents_stripeEventId_unique` UNIQUE(`stripeEventId`)
);
--> statement-breakpoint
ALTER TABLE `incentiveOptions` MODIFY COLUMN `resolutionWindowDays` int NOT NULL DEFAULT 7;--> statement-breakpoint
ALTER TABLE `campaigns` ADD `merchantId` int;--> statement-breakpoint
ALTER TABLE `campaigns` ADD `resolutionCron` varchar(64) DEFAULT '0 0 9 * * 1';--> statement-breakpoint
ALTER TABLE `campaigns` ADD `capMonthsPer365d` int DEFAULT 12 NOT NULL;--> statement-breakpoint
ALTER TABLE `campaigns` ADD `claimWindowDays` int DEFAULT 7 NOT NULL;