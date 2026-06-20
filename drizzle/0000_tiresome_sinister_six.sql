CREATE TABLE `distributions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`property_id` varchar(64) NOT NULL,
	`investor_id` int NOT NULL,
	`year` int NOT NULL,
	`amount` decimal(14,2) NOT NULL,
	`type` enum('k1','cash','return_of_capital','other') NOT NULL DEFAULT 'k1',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `distributions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`property_id` varchar(64),
	`investor_id` int,
	`filename` varchar(255) NOT NULL,
	`storage_key` varchar(512) NOT NULL,
	`storage_url` varchar(512) NOT NULL,
	`mime_type` varchar(128),
	`size_bytes` bigint,
	`category` enum('lp_agreement','k1','tax_form','correspondence','other') NOT NULL DEFAULT 'other',
	`year` int,
	`uploaded_by` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `investor_notes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`investor_id` int NOT NULL,
	`property_id` varchar(64),
	`content` text NOT NULL,
	`author_id` int,
	`author_name` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `investor_notes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `investors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(320),
	`phone` varchar(32),
	`address` text,
	`status` enum('active','deceased','transferred','bought_out') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `investors_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `properties` (
	`id` varchar(64) NOT NULL,
	`name` varchar(255) NOT NULL,
	`entity_name` varchar(255) NOT NULL,
	`entity_ein` varchar(20),
	`is_grove_park` boolean NOT NULL DEFAULT false,
	`mt_note` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `properties_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `property_investors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`property_id` varchar(64) NOT NULL,
	`investor_id` int NOT NULL,
	`pct_capital` decimal(12,6),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `property_investors_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
