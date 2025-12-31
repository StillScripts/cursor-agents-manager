CREATE TABLE `time_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`task_id` text NOT NULL,
	`activity_type` text NOT NULL,
	`start_time` integer NOT NULL,
	`end_time` integer,
	`duration` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
