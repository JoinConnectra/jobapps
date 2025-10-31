# University-Employer Flow Implementation

## Overview
This document outlines the complete implementation of the university-employer flow that allows companies to request access to university networks, universities to approve/reject those requests, and job visibility to be filtered based on university affiliation.

## ✅ Implemented Features

### 1. Educational Institution Access in Company Settings
**Location**: `src/components/SettingsModal.tsx`

**Features**:
- New "Educational Institution Access" section in company settings modal
- Lists all registered universities in the system
- Shows approved universities with green checkmarks
- Allows companies to request access to universities
- Displays pending/approved status for each university

**API Endpoints Used**:
- `GET /api/employer/universities?orgId={id}` - Fetch universities with approval status
- `POST /api/employer/universities/{id}/request` - Request access to a university

### 2. Job Visibility Options in Job Creation
**Locations**: 
- `src/app/dashboard/jobs/page.tsx` (main jobs page)
- `src/app/dashboard/organizations/[id]/jobs/new/page.tsx` (organization-specific)

**Features**:
- Visibility options: "Public", "Selected Institutions Only", "Institutions + Public"
- University selection dropdown appears when "institutions" or "both" is selected
- Only shows approved universities for the organization
- Checkbox interface for selecting multiple universities
- Form validation and error handling

**Form Fields Added**:
```typescript
{
  visibility: 'public' | 'institutions' | 'both',
  universityIds: number[]
}
```

### 3. University-Based Job Filtering for Students
**Location**: `src/app/api/jobs/route.ts`

**Features**:
- Automatic university affiliation detection based on:
  - User's account type (university users)
  - Email domain matching for students
- Smart job filtering:
  - Public jobs: visible to everyone
  - Both jobs: visible to everyone
  - Institution jobs: only visible to affiliated students
- University-specific job targeting through `jobUniversities` table

**Filtering Logic**:
1. Get user's university affiliation
2. Show all public and "both" jobs
3. For "institutions" jobs, only show if user has university affiliation
4. Add university-specific jobs based on `jobUniversities` mappings

### 4. Database Schema Support
**Tables Used**:
- `organizations` - Stores university organizations (type: 'university')
- `universityAuthorizations` - Tracks company-university access requests
- `jobUniversities` - Links jobs to specific universities
- `users` - User accounts with accountType field

## 🔄 Complete Flow

### Step 1: Company Requests University Access
1. Company admin goes to `/dashboard` → Settings
2. Navigates to "Educational Institution Access" section
3. Sees list of registered universities
4. Clicks "Request" button for desired universities
5. Status changes to "Pending Approval"

### Step 2: University Reviews and Approves
1. University admin goes to `/university/dashboard/requests`
2. Sees pending requests from companies
3. Reviews company details
4. Clicks "Approve" or "Reject"
5. Company's settings update to show "Approved" status

### Step 3: Company Creates Targeted Jobs
1. Company goes to job creation form
2. Selects visibility: "Selected Institutions Only" or "Institutions + Public"
3. Selects specific universities from approved list
4. Job is created with university targeting

### Step 4: Students See Relevant Jobs
1. Student logs in with university email (e.g., student@lums.edu.pk)
2. System automatically detects university affiliation
3. Student sees:
   - All public jobs
   - All "both" jobs
   - University-specific "institutions" jobs
4. Jobs are filtered in real-time based on affiliation

## 🧪 Testing Instructions

### Test Case 1: Company-University Request Flow
1. **Setup**: Create a company account and a university account
2. **Company Side**:
   - Login as company admin
   - Go to Settings → Educational Institution Access
   - Request access to the university
   - Verify status shows "Pending"
3. **University Side**:
   - Login as university admin
   - Go to `/university/dashboard/requests`
   - See the pending request
   - Approve the request
4. **Verification**:
   - Company settings should show "Approved" status
   - Company can now select this university in job creation

### Test Case 2: Job Creation with University Targeting
1. **Setup**: Company with approved university access
2. **Create Job**:
   - Go to job creation form
   - Select "Selected Institutions Only" visibility
   - Select the approved university
   - Create the job
3. **Verification**:
   - Job should be created with `visibility: 'institutions'`
   - `jobUniversities` table should have the mapping

### Test Case 3: Student Job Filtering
1. **Setup**: 
   - Create a student account with university email domain
   - Create jobs with different visibility settings
2. **Test Public Jobs**:
   - Student should see all "public" jobs
3. **Test University Jobs**:
   - Student should see "institutions" jobs for their university
   - Student should NOT see "institutions" jobs for other universities
4. **Test Both Jobs**:
   - Student should see all "both" jobs

### Test Case 4: Email Domain Matching
1. **Setup**: University with domain "lums.edu.pk"
2. **Test Students**:
   - `student@lums.edu.pk` should be linked to LUMS
   - `student@other.edu` should not be linked to any university
3. **Verification**:
   - LUMS students see LUMS-targeted jobs
   - Other students don't see LUMS-targeted jobs

## 🔧 Configuration

### Environment Variables
No additional environment variables required. Uses existing database and auth setup.

### Database Migrations
Ensure these tables exist:
- `universityAuthorizations` - for tracking access requests
- `jobUniversities` - for linking jobs to universities
- `organizations` with `type` field for university organizations

### API Endpoints
All required endpoints are already implemented:
- `/api/employer/universities` - University management
- `/api/university/requests` - Request management
- `/api/jobs` - Enhanced job filtering

## 🚀 Deployment Notes

1. **Database**: Ensure all tables are migrated
2. **Authentication**: Uses existing auth system
3. **Permissions**: University users need access to `/university/dashboard`
4. **Email Domains**: Configure university email domain matching as needed

## 📊 Monitoring

### Key Metrics to Track
- Number of university access requests
- Approval/rejection rates
- Job visibility distribution (public vs institutions)
- Student engagement with university-targeted jobs

### Logs to Monitor
- University affiliation detection
- Job filtering decisions
- Access request approvals/rejections

## 🔮 Future Enhancements

1. **Advanced Domain Matching**: More sophisticated email domain matching
2. **Bulk Operations**: Bulk approve/reject requests
3. **Analytics**: Detailed analytics for university job performance
4. **Notifications**: Email notifications for request status changes
5. **Custom Domains**: Allow universities to configure custom email domains
