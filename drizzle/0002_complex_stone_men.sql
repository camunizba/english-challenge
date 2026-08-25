ALTER TABLE `students` ADD `viewerUserId` int;--> statement-breakpoint
ALTER TABLE `students` ADD CONSTRAINT `students_viewerUserId_unique` UNIQUE(`viewerUserId`);--> statement-breakpoint
ALTER TABLE `students` ADD CONSTRAINT `students_viewerUserId_users_id_fk` FOREIGN KEY (`viewerUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;