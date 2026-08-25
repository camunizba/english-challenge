CREATE TABLE `activityEntries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`idempotencyKey` varchar(128) NOT NULL,
	`studentId` int NOT NULL,
	`classId` int NOT NULL,
	`subjectId` int NOT NULL,
	`cycleId` int,
	`action` enum('English Interaction','Initiative Bonus','Portuguese Occurrence') NOT NULL,
	`points` decimal(6,2) NOT NULL,
	`status` enum('active','cancelled','under_review') NOT NULL DEFAULT 'active',
	`note` text,
	`recordedAt` timestamp NOT NULL,
	`syncedAt` timestamp,
	`syncStatus` enum('synced','pending','conflict') NOT NULL DEFAULT 'synced',
	`createdByUserId` int NOT NULL,
	`undoExpiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `activityEntries_id` PRIMARY KEY(`id`),
	CONSTRAINT `activityEntries_idempotencyKey_unique` UNIQUE(`idempotencyKey`)
);
--> statement-breakpoint
CREATE TABLE `appeals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`entryId` int NOT NULL,
	`studentId` int NOT NULL,
	`requesterUserId` int,
	`reason` text NOT NULL,
	`status` enum('pending','in_review','maintained','corrected','cancelled') NOT NULL DEFAULT 'pending',
	`resolution` text,
	`resolvedByUserId` int,
	`resolvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `appeals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `auditLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`actorUserId` int,
	`eventType` varchar(120) NOT NULL,
	`resourceType` varchar(120) NOT NULL,
	`resourceId` varchar(120) NOT NULL,
	`detail` text NOT NULL,
	`occurredAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auditLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `championCycles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(140) NOT NULL,
	`startsAt` timestamp NOT NULL,
	`endsAt` timestamp NOT NULL,
	`status` enum('draft','active','review','closed','archived') NOT NULL DEFAULT 'draft',
	`prizeName` varchar(160) NOT NULL,
	`prizeDescription` text,
	`minInteractions` int NOT NULL DEFAULT 3,
	`minParticipationDays` int NOT NULL DEFAULT 2,
	`requireZeroPortugueseOccurrences` boolean NOT NULL DEFAULT true,
	`createdByUserId` int,
	`closedByUserId` int,
	`closureReason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `championCycles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `championWinners` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cycleId` int NOT NULL,
	`studentId` int NOT NULL,
	`confirmedByUserId` int,
	`confirmedAt` timestamp,
	`published` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `championWinners_id` PRIMARY KEY(`id`),
	CONSTRAINT `champion_winner_unique` UNIQUE(`cycleId`,`studentId`)
);
--> statement-breakpoint
CREATE TABLE `classes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolYearId` int NOT NULL,
	`segment` varchar(80) NOT NULL,
	`grade` varchar(80) NOT NULL,
	`name` varchar(100) NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `classes_id` PRIMARY KEY(`id`),
	CONSTRAINT `class_year_name_unique` UNIQUE(`schoolYearId`,`name`)
);
--> statement-breakpoint
CREATE TABLE `entryRevisions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`entryId` int NOT NULL,
	`revisionType` enum('cancelled','corrected','restored') NOT NULL,
	`previousPoints` decimal(6,2),
	`newPoints` decimal(6,2),
	`reason` text NOT NULL,
	`revisedByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `entryRevisions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `gradeConversions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`studentId` int NOT NULL,
	`subjectId` int NOT NULL,
	`schoolYearId` int NOT NULL,
	`periodLabel` varchar(80) NOT NULL,
	`rawPoints` decimal(7,2) NOT NULL,
	`configuredCeiling` decimal(6,2) NOT NULL,
	`convertedPoints` decimal(6,2) NOT NULL,
	`administrativeAdjustment` decimal(6,2) NOT NULL DEFAULT '0.00',
	`approvedPoints` decimal(6,2),
	`status` enum('preview','approved','rejected') NOT NULL DEFAULT 'preview',
	`approvedByUserId` int,
	`approvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `gradeConversions_id` PRIMARY KEY(`id`),
	CONSTRAINT `conversion_period_unique` UNIQUE(`studentId`,`subjectId`,`schoolYearId`,`periodLabel`)
);
--> statement-breakpoint
CREATE TABLE `importBatches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`sourceType` enum('csv','spreadsheet','pdf') NOT NULL,
	`status` enum('draft','validated','imported','failed') NOT NULL DEFAULT 'draft',
	`totalRows` int NOT NULL DEFAULT 0,
	`importedRows` int NOT NULL DEFAULT 0,
	`errorSummary` text,
	`createdByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `importBatches_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `schoolYears` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(40) NOT NULL,
	`startsAt` timestamp NOT NULL,
	`endsAt` timestamp NOT NULL,
	`timezone` varchar(64) NOT NULL DEFAULT 'America/Sao_Paulo',
	`status` enum('active','closed') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `schoolYears_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `scoringRules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`action` enum('English Interaction','Initiative Bonus','Portuguese Occurrence') NOT NULL,
	`points` decimal(6,2) NOT NULL,
	`effectiveFrom` timestamp NOT NULL,
	`effectiveUntil` timestamp,
	`maxPositivePoints` decimal(6,2),
	`maxNegativePoints` decimal(6,2),
	`cooldownSeconds` int NOT NULL DEFAULT 15,
	`correctionWindowHours` int NOT NULL DEFAULT 24,
	`status` enum('active','superseded') NOT NULL DEFAULT 'active',
	`createdByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `scoringRules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `students` (
	`id` int AUTO_INCREMENT NOT NULL,
	`enrollmentNumber` varchar(64) NOT NULL,
	`firstName` varchar(120) NOT NULL,
	`lastName` varchar(120) NOT NULL,
	`publicName` varchar(140),
	`classId` int,
	`status` enum('active','inactive') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `students_id` PRIMARY KEY(`id`),
	CONSTRAINT `students_enrollmentNumber_unique` UNIQUE(`enrollmentNumber`)
);
--> statement-breakpoint
CREATE TABLE `subjects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(32) NOT NULL,
	`name` varchar(120) NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `subjects_id` PRIMARY KEY(`id`),
	CONSTRAINT `subjects_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `teacherAssignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`classId` int NOT NULL,
	`subjectId` int NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `teacherAssignments_id` PRIMARY KEY(`id`),
	CONSTRAINT `teacher_assignment_unique` UNIQUE(`userId`,`classId`,`subjectId`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','viewer','teacher','leadership') NOT NULL DEFAULT 'viewer';--> statement-breakpoint
ALTER TABLE `activityEntries` ADD CONSTRAINT `activityEntries_studentId_students_id_fk` FOREIGN KEY (`studentId`) REFERENCES `students`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `activityEntries` ADD CONSTRAINT `activityEntries_classId_classes_id_fk` FOREIGN KEY (`classId`) REFERENCES `classes`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `activityEntries` ADD CONSTRAINT `activityEntries_subjectId_subjects_id_fk` FOREIGN KEY (`subjectId`) REFERENCES `subjects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `activityEntries` ADD CONSTRAINT `activityEntries_cycleId_championCycles_id_fk` FOREIGN KEY (`cycleId`) REFERENCES `championCycles`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `activityEntries` ADD CONSTRAINT `activityEntries_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `appeals` ADD CONSTRAINT `appeals_entryId_activityEntries_id_fk` FOREIGN KEY (`entryId`) REFERENCES `activityEntries`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `appeals` ADD CONSTRAINT `appeals_studentId_students_id_fk` FOREIGN KEY (`studentId`) REFERENCES `students`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `appeals` ADD CONSTRAINT `appeals_requesterUserId_users_id_fk` FOREIGN KEY (`requesterUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `appeals` ADD CONSTRAINT `appeals_resolvedByUserId_users_id_fk` FOREIGN KEY (`resolvedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `auditLogs` ADD CONSTRAINT `auditLogs_actorUserId_users_id_fk` FOREIGN KEY (`actorUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `championCycles` ADD CONSTRAINT `championCycles_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `championCycles` ADD CONSTRAINT `championCycles_closedByUserId_users_id_fk` FOREIGN KEY (`closedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `championWinners` ADD CONSTRAINT `championWinners_cycleId_championCycles_id_fk` FOREIGN KEY (`cycleId`) REFERENCES `championCycles`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `championWinners` ADD CONSTRAINT `championWinners_studentId_students_id_fk` FOREIGN KEY (`studentId`) REFERENCES `students`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `championWinners` ADD CONSTRAINT `championWinners_confirmedByUserId_users_id_fk` FOREIGN KEY (`confirmedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `classes` ADD CONSTRAINT `classes_schoolYearId_schoolYears_id_fk` FOREIGN KEY (`schoolYearId`) REFERENCES `schoolYears`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `entryRevisions` ADD CONSTRAINT `entryRevisions_entryId_activityEntries_id_fk` FOREIGN KEY (`entryId`) REFERENCES `activityEntries`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `entryRevisions` ADD CONSTRAINT `entryRevisions_revisedByUserId_users_id_fk` FOREIGN KEY (`revisedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `gradeConversions` ADD CONSTRAINT `gradeConversions_studentId_students_id_fk` FOREIGN KEY (`studentId`) REFERENCES `students`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `gradeConversions` ADD CONSTRAINT `gradeConversions_subjectId_subjects_id_fk` FOREIGN KEY (`subjectId`) REFERENCES `subjects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `gradeConversions` ADD CONSTRAINT `gradeConversions_schoolYearId_schoolYears_id_fk` FOREIGN KEY (`schoolYearId`) REFERENCES `schoolYears`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `gradeConversions` ADD CONSTRAINT `gradeConversions_approvedByUserId_users_id_fk` FOREIGN KEY (`approvedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `importBatches` ADD CONSTRAINT `importBatches_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `scoringRules` ADD CONSTRAINT `scoringRules_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `students` ADD CONSTRAINT `students_classId_classes_id_fk` FOREIGN KEY (`classId`) REFERENCES `classes`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `teacherAssignments` ADD CONSTRAINT `teacherAssignments_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `teacherAssignments` ADD CONSTRAINT `teacherAssignments_classId_classes_id_fk` FOREIGN KEY (`classId`) REFERENCES `classes`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `teacherAssignments` ADD CONSTRAINT `teacherAssignments_subjectId_subjects_id_fk` FOREIGN KEY (`subjectId`) REFERENCES `subjects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `activity_student_subject_idx` ON `activityEntries` (`studentId`,`subjectId`,`recordedAt`);--> statement-breakpoint
CREATE INDEX `activity_teacher_cooldown_idx` ON `activityEntries` (`createdByUserId`,`studentId`,`action`,`recordedAt`);--> statement-breakpoint
CREATE INDEX `audit_resource_idx` ON `auditLogs` (`resourceType`,`resourceId`,`occurredAt`);--> statement-breakpoint
CREATE INDEX `rule_action_status_idx` ON `scoringRules` (`action`,`status`);--> statement-breakpoint
CREATE INDEX `student_class_status_idx` ON `students` (`classId`,`status`);