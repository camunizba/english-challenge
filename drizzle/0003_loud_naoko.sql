ALTER TABLE `users` ADD `accessStatus` enum('active','suspended') NOT NULL DEFAULT 'active';
