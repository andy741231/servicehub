BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[User] (
    [id] NVARCHAR(1000) NOT NULL,
    [username] NVARCHAR(1000),
    [email] NVARCHAR(1000) NOT NULL,
    [password] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [isActive] BIT NOT NULL CONSTRAINT [User_isActive_df] DEFAULT 1,
    [refreshToken] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [User_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [User_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [User_username_key] UNIQUE NONCLUSTERED ([username])
);

-- CreateTable
CREATE TABLE [dbo].[Role] (
    [id] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [Role_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Role_name_key] UNIQUE NONCLUSTERED ([name])
);

-- CreateTable
CREATE TABLE [dbo].[UserRole] (
    [userId] NVARCHAR(1000) NOT NULL,
    [roleId] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [UserRole_pkey] PRIMARY KEY CLUSTERED ([userId],[roleId])
);

-- CreateTable
CREATE TABLE [dbo].[AppPermission] (
    [id] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [appId] NVARCHAR(1000) NOT NULL,
    [canAccess] BIT NOT NULL CONSTRAINT [AppPermission_canAccess_df] DEFAULT 0,
    CONSTRAINT [AppPermission_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [AppPermission_userId_appId_key] UNIQUE NONCLUSTERED ([userId],[appId])
);

-- CreateTable
CREATE TABLE [dbo].[WebPage] (
    [id] NVARCHAR(1000) NOT NULL,
    [slug] NVARCHAR(1000) NOT NULL,
    [title] NVARCHAR(1000) NOT NULL,
    [template] NVARCHAR(1000) NOT NULL CONSTRAINT [WebPage_template_df] DEFAULT 'modern',
    [header] NVARCHAR(1000),
    [footer] NVARCHAR(1000),
    [isPublished] BIT NOT NULL CONSTRAINT [WebPage_isPublished_df] DEFAULT 1,
    [navLabel] NVARCHAR(1000),
    [href] NVARCHAR(1000),
    [parentId] NVARCHAR(1000),
    [order] INT NOT NULL CONSTRAINT [WebPage_order_df] DEFAULT 0,
    [isReserved] BIT NOT NULL CONSTRAINT [WebPage_isReserved_df] DEFAULT 0,
    [hideFromNav] BIT NOT NULL CONSTRAINT [WebPage_hideFromNav_df] DEFAULT 0,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [WebPage_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [WebPage_slug_key] UNIQUE NONCLUSTERED ([slug])
);

-- CreateTable
CREATE TABLE [dbo].[WebBlock] (
    [id] NVARCHAR(1000) NOT NULL,
    [pageId] NVARCHAR(1000) NOT NULL,
    [type] NVARCHAR(1000) NOT NULL,
    [order] INT NOT NULL,
    [content] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [WebBlock_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Form] (
    [id] NVARCHAR(1000) NOT NULL,
    [title] NVARCHAR(1000) NOT NULL,
    [schema] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Form_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [deletedAt] DATETIME2,
    CONSTRAINT [Form_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[FormSubmission] (
    [id] NVARCHAR(1000) NOT NULL,
    [formId] NVARCHAR(1000) NOT NULL,
    [data] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [FormSubmission_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [FormSubmission_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[EmailCampaign] (
    [id] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [subject] NVARCHAR(1000) NOT NULL,
    [bodyHtml] NVARCHAR(1000) NOT NULL,
    [status] NVARCHAR(1000) NOT NULL,
    [scheduledAt] DATETIME2,
    [sentAt] DATETIME2,
    [mailingListId] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [EmailCampaign_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    [deletedAt] DATETIME2,
    CONSTRAINT [EmailCampaign_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[MailingList] (
    [id] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [MailingList_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [MailingList_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Recipient] (
    [id] NVARCHAR(1000) NOT NULL,
    [email] NVARCHAR(1000) NOT NULL,
    [firstName] NVARCHAR(1000),
    [lastName] NVARCHAR(1000),
    [customFields] NVARCHAR(1000),
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [Recipient_status_df] DEFAULT 'active',
    [mailingListId] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Recipient_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Recipient_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[EmailLog] (
    [id] NVARCHAR(1000) NOT NULL,
    [campaignId] NVARCHAR(1000) NOT NULL,
    [recipient] NVARCHAR(1000) NOT NULL,
    [status] NVARCHAR(1000) NOT NULL,
    [sentAt] DATETIME2 NOT NULL CONSTRAINT [EmailLog_sentAt_df] DEFAULT CURRENT_TIMESTAMP,
    [metadata] NVARCHAR(1000),
    CONSTRAINT [EmailLog_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[CampaignMetrics] (
    [id] NVARCHAR(1000) NOT NULL,
    [campaignId] NVARCHAR(1000) NOT NULL,
    [sent] INT NOT NULL CONSTRAINT [CampaignMetrics_sent_df] DEFAULT 0,
    [delivered] INT NOT NULL CONSTRAINT [CampaignMetrics_delivered_df] DEFAULT 0,
    [opened] INT NOT NULL CONSTRAINT [CampaignMetrics_opened_df] DEFAULT 0,
    [clicked] INT NOT NULL CONSTRAINT [CampaignMetrics_clicked_df] DEFAULT 0,
    [bounced] INT NOT NULL CONSTRAINT [CampaignMetrics_bounced_df] DEFAULT 0,
    [unsubscribed] INT NOT NULL CONSTRAINT [CampaignMetrics_unsubscribed_df] DEFAULT 0,
    [complained] INT NOT NULL CONSTRAINT [CampaignMetrics_complained_df] DEFAULT 0,
    CONSTRAINT [CampaignMetrics_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [CampaignMetrics_campaignId_key] UNIQUE NONCLUSTERED ([campaignId])
);

-- CreateTable
CREATE TABLE [dbo].[WebSiteStyle] (
    [id] NVARCHAR(1000) NOT NULL,
    [tokens] NVARCHAR(1000) NOT NULL,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [WebSiteStyle_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[WebAsset] (
    [id] NVARCHAR(1000) NOT NULL,
    [filename] NVARCHAR(1000) NOT NULL,
    [originalName] NVARCHAR(1000) NOT NULL,
    [mimeType] NVARCHAR(1000) NOT NULL,
    [size] INT NOT NULL,
    [url] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [WebAsset_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [WebAsset_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- AddForeignKey
ALTER TABLE [dbo].[UserRole] ADD CONSTRAINT [UserRole_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[UserRole] ADD CONSTRAINT [UserRole_roleId_fkey] FOREIGN KEY ([roleId]) REFERENCES [dbo].[Role]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[AppPermission] ADD CONSTRAINT [AppPermission_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[WebBlock] ADD CONSTRAINT [WebBlock_pageId_fkey] FOREIGN KEY ([pageId]) REFERENCES [dbo].[WebPage]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[FormSubmission] ADD CONSTRAINT [FormSubmission_formId_fkey] FOREIGN KEY ([formId]) REFERENCES [dbo].[Form]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[EmailCampaign] ADD CONSTRAINT [EmailCampaign_mailingListId_fkey] FOREIGN KEY ([mailingListId]) REFERENCES [dbo].[MailingList]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Recipient] ADD CONSTRAINT [Recipient_mailingListId_fkey] FOREIGN KEY ([mailingListId]) REFERENCES [dbo].[MailingList]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[EmailLog] ADD CONSTRAINT [EmailLog_campaignId_fkey] FOREIGN KEY ([campaignId]) REFERENCES [dbo].[EmailCampaign]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[CampaignMetrics] ADD CONSTRAINT [CampaignMetrics_campaignId_fkey] FOREIGN KEY ([campaignId]) REFERENCES [dbo].[EmailCampaign]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH

