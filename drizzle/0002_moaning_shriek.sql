CREATE TABLE `incentives` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`transactionId` int NOT NULL,
	`subscriptionId` int,
	`conditionKey` varchar(64) NOT NULL,
	`conditionLabel` varchar(256) NOT NULL,
	`conditionCategory` enum('market','sports','economy','custom') NOT NULL,
	`conditionDetail` text,
	`rewardDescription` varchar(256) NOT NULL,
	`rewardValueCents` int NOT NULL,
	`status` enum('pending','achieved','not_achieved','expired','cancelled') NOT NULL DEFAULT 'pending',
	`resolvedAt` timestamp,
	`expiresAt` timestamp,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `incentives_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
DROP TABLE `wagers`;--> statement-breakpoint
ALTER TABLE `transactions` ADD `incentiveSelected` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `transactions` DROP COLUMN `wagerSelected`;