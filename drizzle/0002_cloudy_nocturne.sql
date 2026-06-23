CREATE TABLE `dismissed_duplicates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`group_key` varchar(512) NOT NULL,
	`label` varchar(512) NOT NULL,
	`scan_type` enum('email','name') NOT NULL,
	`dismissedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `dismissed_duplicates_id` PRIMARY KEY(`id`),
	CONSTRAINT `dismissed_duplicates_group_key_unique` UNIQUE(`group_key`)
);
