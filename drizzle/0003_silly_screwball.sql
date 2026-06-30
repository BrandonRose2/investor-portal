CREATE TABLE `marc_access_users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`display_name` varchar(256),
	`pin_hash` varchar(256),
	`is_active` boolean NOT NULL DEFAULT true,
	`last_access_at` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `marc_access_users_id` PRIMARY KEY(`id`),
	CONSTRAINT `marc_access_users_email_unique` UNIQUE(`email`)
);
