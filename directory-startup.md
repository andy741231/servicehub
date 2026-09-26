# Church Directory — User and Functional Requirements

## INTRODUCTION

The church in Houston needs a means for all the saints meeting with us to contact one another for the purpose of fellowship. The current system that has been used for over 5 years has ceased to function and no one has the knowledge to be able to repair it. In recent years, the church infrastructure has changed sufficiently to be able to support a system that should be easier to maintain and simpler for users to use.

## SYSTEM CAPABILITIES

## ROLES AND FUNCTIONS

### Roles

Helpers and Approvers do two things: 1) help the saints update their information if they don't understand how, 2) help add saints that desire to be added to the phone list. When someone is added, the Approver activates them in the system so that all the other saints in Houston can look them up. From that point the responsibility rests with the saints to keep their data up to date, however the Helper and Approver may prompt them to update if they notice problems with their data. As serving ones, we may also serve the saints by helping them to make the updates and, particularly for those who are more technologically challenged, make the changes for them.

#### Saints

The main responsibility of the saints in maintaining the phone list is to maintain their own contact information including phone numbers, email addresses, street address and mailing address (if different). Although we would like to make the process of maintaining their contact as easy as possible, we need to provide them documentation that is simple to access, context driven, if possible. If they need help beyond this, then contact information for those in their district should be readily available.

#### Helpers And Approvers

In each district, there are one or more saints who have been assigned responsibility to add and remove saints in their district. Adding should be done in fellowship with the saints to be added and the responsible brothers in the district so that new ones are not added before their desire and intention to meet with the church in Houston becomes clear. Also, before adding someone to the church phone list, there should first be a check to make sure that they have not already been added by someone else. They could have been added by another Helper who did so without fellowship or by someone in another district.

When a saint decides that they want to meet with another district, there should be fellowship with the brothers in that district to make sure that both the sending district and receiving district are aware of the change so that the change in district can be documented in the saint's phone list record rather than creating a duplicate record in the new district. Approvers are responsible for verifying that no duplicate record has been created before activating a newly added saint.

Removing (setting someone to NOT ACTIVE status) should also be done in fellowship with the responsible brothers after it becomes clear through their prayer, fellowship and shepherding of the saints who have not been meeting for a while with the church in Houston. They should be considered as NOT ACTIVE if (1) they have expressed that it is their desire and intention not to meet with the church in Houston, or (2) the contact information that we have for them is no longer valid and/or their actions demonstrate that they no longer desire or intend to meet. If through the district saints' prayer and fellowship, a saint is recovered, then the saint can simply be reactivated so that their contact information can be verified and updated as needed.

#### Removal from the Phone List

The system should not actually physically delete phone list records in most cases but should mark them so that they are only accessible to Approvers and Administrators.

Reasons for Removal:

1. They have moved — **MOVED** status
2. They go to be with the Lord — **DECEASED** status
3. Become negative — **NEGATIVE** status
4. A duplicate entry is created — **DUPLICATE** status. A record should only be marked DUPLICATE after verifying which record has the most correct information. If the records are the same, then either one can be marked. These records can be physically deleted from the system.

After saints are added, then the responsibility for maintaining their information is theirs. The saints are likely to need some shepherding — reminding, asking and tutoring. If the saints are going to be able to learn to maintain their information, they need to be encouraged to do this. It is best if the Helpers and Approvers support them in this rather than doing it for them unless they are unable to do so due to personal circumstances (lack of a phone that has text capabilities, technology aversion, ill health, extremely challenging work schedule, etc.). However, in this service as in all church services, the goal is to minister Christ to the saints and facilitate fellowship in the body for the mutual building up. May we serve the Lord and the saints as profitable slaves.

As one who is given to serving the saints, you should also be prepared for requests that are outside of the boundaries of the responsibilities described in this document. This document is not a "job description" detailing everything that you might be asked to do and limiting you to only these things. We should joyfully undertake to serve the saints in any way that we can and, if we cannot help them directly, fellowship with responsible brothers in your district to find out who can.

You should also be aware that saints might ask you to serve them by providing contact information that is not available to them through the phone list system. For example, someone may ask you for a list of the mailing addresses for some or all the saints in the district or even the church. Should you just give it to them? Just because you have access to the information doesn't mean that you should. One of our primary duties as saints serving as Helpers and Approvers or as Service Office saints is to protect the privacy of the information that the saints have entrusted to us so that it is used only for legitimate church purposes. This responsibility comes before the obligation to fulfill a request from a saint.

In cases such as the above, you should seek fellowship with a responsible brother in your district and, if none are available, then another leading brother of the church in Houston. Much will depend on who the saint is that is making the request and the purpose of the request. If you have any concerns or questions about a request, particularly if it involves providing contact information that is not readily available to the requestor through the phone list system, then fellowship is always appropriate, even necessary, before providing what is requested.

##### Additional Helper and Approver Activities

An Admin can perform any of the functions below. None of these tasks should be executed by anyone without first having fellowship with a responsible brother.

###### When Problems Arise

Whenever saints have difficulty using the online phone list system, they should report the problem to Helpers and Approvers and ask them for help. If they are unable to resolve, they should ask the Administrators for assistance. As serving ones, do your best to answer the questions, help train the saints in the proper way to use the system and also make sure that they know how to access the user documentation for the system so that they will be able to reference it to help themselves and others.

## DATA ELEMENTS

### Role — Basic Functions

| Role | Basic Functions |
| --- | --- |
| Saint | Input their new or updated contact information and look up phone numbers for other saints as needed for fellowship. |
| Helper | Assist the saints in their district and the phone list Approvers. Helpers may include all service office brothers in the district who are not Approvers as well as other saints assigned this responsibility. |
| Approver | Make sure that the phone list records for the saints in their district are accurate and complete, and that the security of the data is maintained. |
| Admin | Maintain the directory so that it functions as needed by all roles. Design and apply system updates as needed in coordination with overseeing brothers. |

### Activity — Who Can Perform

| Activity | Who can perform |
| --- | --- |
| Changes the role of the person associated with the ID number from Saint or Approver to Helper. | Approver |
| Changes the role of the person associated with the ID number from Saint or Helper to Approver. | Approver |
| Changes the role of the person associated with the ID number from Helper to Saint. | Helper and Approver |
| Changes the role of the person associated with the ID number from Approver to Saint. | Approver |
| Make system changes as needed for system maintenance and new functionality. Load and back up data as needed. Recover data deleted in error. | Administrator |

### Directory Data Elements

| Element | Description | Required/Optional | How Entered |
| --- | --- | --- | --- |
| Identifier | Unique record id | Required | System Generated |
| Email | Email address for church communications (and system login?) | Required | Manually Entered |
| Change Type | Code indicating type of last change | Required | System Generated |
| Change date/timestamp | Timestamp with date | Required | System Generated |
| User Type | User, Helper, Approver, Admin | Required | Manually Entered |
| Head of Household | Indicator designating person who is head of a household, meaning someone who has a spouse and/or children. Blank for non-HHH spouses and singles with no dependents. | Optional | Manually Entered |
| Status | Active, Inactive, Moved, Deceased, Negative, Duplicate, Delete | Required | Manually Entered |
| District | Central 1, Central 2, Central 3, C - Sugar Land, C - Diho, C - Medical Ctr, S - Spanish Lang, Southwest, South, Southeast, North, West | Required | Manually Entered |
| First | First Name | Required | Manually Entered |
| Middle | Middle Name or Initial | Optional | Manually Entered |
| Last | Last Name | Required | Manually Entered |
| Couple ID | Unique identifier of a couple who are both in the phone list | Required | System Generated |
| Spouse (First name) | First Name | Optional | Manually Entered |
| Spouse (Last name) | Last Name | Optional | Manually Entered |
| Gender | Brother or Sister | Required | Manually Entered |
| Other Name | Other spelling, maiden name or non-English script | Optional | Manually Entered |
| Marital Status | Single, married, widowed, or divorced | Required | Manually Entered |
| Added Date | Date added to the phone list | Required | System Generated |
| Date of Birth | Date of Birth | Optional | Manually Entered |
| Profile Photo | Profile Photo | Optional | Uploaded |
| Small Group | Name of small group that saints meets with | Optional | Manually Entered |
| Phone 1 | Primary contact number | Required | Manually Entered |
| Phone 2 | Alternate phone number | Optional | Manually Entered |
| Phone Privacy | NO indicates phone fields would NOT be visible to anyone but to themselves and authorized persons such as Admins or approvers. YES indicates phone fields would be visible to other users. Default should be YES. | Required | Manually Entered |
| Address | Street Address | Required | Manually Entered |
| Apartment Number | Apartment Number | Optional | Manually Entered |
| City | City | Required | Manually Entered |
| State | State | Required | Manually Entered |
| Zip | ZIP code | Required | Manually Entered |
| Address Privacy | NO indicates address fields would NOT be visible to anyone but to themselves and authorized persons such as Admins or approvers. YES indicates address would be visible to other users. Default should be NO. | Required | Manually Entered |
| Locality | Default to Houston. If Status is MOVED when move to another church, then can enter new city. | Required | System Generated |
| Opt-in-out | Directory Opt-In/Opt-Out | Required | Manually Entered |
