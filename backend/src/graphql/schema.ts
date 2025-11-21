/**
 * ClickView GraphQL Schema
 *
 * Comprehensive schema for all resources with:
 * - Queries for data retrieval
 * - Mutations for data modification
 * - Subscriptions for real-time updates
 * - Field-level authorization
 * - DataLoader integration
 */

export const typeDefs = `#graphql
  # ===================================================================
  # SCALARS & ENUMS
  # ===================================================================

  scalar DateTime
  scalar JSON
  scalar Upload

  enum UserRole {
    OWNER
    ADMIN
    MEMBER
    VIEWER
  }

  enum PermissionLevel {
    OWNER
    ADMIN
    EDIT
    VIEW
    NONE
  }

  enum SensitivityLevel {
    PUBLIC
    INTERNAL
    CONFIDENTIAL
    RESTRICTED
    CRITICAL
  }

  enum MaskingType {
    FULL
    PARTIAL
    EMAIL
    PHONE
    CREDIT_CARD
    SSN
    HASH
    NULL
    CUSTOM
  }

  enum WidgetType {
    LINE_CHART
    BAR_CHART
    PIE_CHART
    AREA_CHART
    SCATTER_CHART
    METRIC
    TABLE
    FUNNEL
    HEATMAP
    MAP
    CUSTOM
  }

  enum RefreshInterval {
    REAL_TIME
    ONE_MINUTE
    FIVE_MINUTES
    FIFTEEN_MINUTES
    THIRTY_MINUTES
    ONE_HOUR
    SIX_HOURS
    TWELVE_HOURS
    DAILY
    MANUAL
  }

  # ===================================================================
  # USER & AUTHENTICATION
  # ===================================================================

  type User {
    id: ID!
    email: String!
    username: String!
    firstName: String
    lastName: String
    fullName: String
    avatar: String

    # Status
    emailVerified: Boolean!
    phoneVerified: Boolean!
    mfaEnabled: Boolean!
    isActive: Boolean!
    isLocked: Boolean!

    # Organization membership
    organizations: [OrganizationMembership!]!
    currentOrganization: Organization

    # Roles & Permissions
    roles: [Role!]!
    permissions: [String!]!

    # Profile
    timezone: String
    locale: String
    preferences: JSON

    # Metadata
    createdAt: DateTime!
    updatedAt: DateTime!
    lastLoginAt: DateTime
  }

  type AuthPayload {
    token: String!
    refreshToken: String
    user: User!
    requiresMfa: Boolean!
    mfaToken: String
  }

  type Session {
    id: ID!
    user: User!
    ipAddress: String
    userAgent: String
    deviceType: String
    deviceName: String
    isActive: Boolean!
    lastActivityAt: DateTime!
    expiresAt: DateTime!
    createdAt: DateTime!
  }

  # ===================================================================
  # ORGANIZATION & TENANCY
  # ===================================================================

  type Organization {
    id: ID!
    name: String!
    slug: String!
    logoUrl: String
    primaryColor: String

    # Subscription
    planType: String!
    maxUsers: Int
    maxWorkspaces: Int
    maxDashboards: Int
    features: JSON

    # Members
    members: [OrganizationMembership!]!
    memberCount: Int!

    # Resources
    workspaces: [Workspace!]!
    dashboards: [Dashboard!]!

    # Status
    isActive: Boolean!
    trialEndsAt: DateTime
    subscriptionEndsAt: DateTime

    # Settings
    settings: JSON

    # Metadata
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type OrganizationMembership {
    id: ID!
    organization: Organization!
    user: User!
    role: UserRole!
    status: String!
    joinedAt: DateTime!
    invitedBy: User
  }

  # ===================================================================
  # WORKSPACES & DASHBOARDS
  # ===================================================================

  type Workspace {
    id: ID!
    name: String!
    description: String
    icon: String
    color: String

    # Organization
    organization: Organization
    owner: User!

    # Dashboards
    dashboards: [Dashboard!]!
    dashboardCount: Int!

    # Permissions
    visibility: String!
    permissions: [ResourcePermission!]!
    canEdit: Boolean!
    canDelete: Boolean!
    canShare: Boolean!

    # Metadata
    createdAt: DateTime!
    updatedAt: DateTime!
    lastAccessedAt: DateTime
  }

  type Dashboard {
    id: ID!
    name: String!
    description: String
    workspace: Workspace!

    # Layout & Settings
    layout: JSON
    settings: JSON
    theme: String
    refreshInterval: RefreshInterval

    # Widgets
    widgets: [Widget!]!
    widgetCount: Int!

    # Data source
    dataSource: DataSource

    # Permissions
    visibility: String!
    permissions: [ResourcePermission!]!
    owner: User!
    canEdit: Boolean!
    canDelete: Boolean!
    canShare: Boolean!

    # Sensitivity
    sensitivity: SensitivityLevel

    # Metadata
    createdAt: DateTime!
    updatedAt: DateTime!
    lastViewedAt: DateTime
    viewCount: Int
  }

  type Widget {
    id: ID!
    dashboard: Dashboard!

    # Configuration
    type: WidgetType!
    title: String!
    description: String
    config: JSON!

    # Position & Size
    x: Int!
    y: Int!
    width: Int!
    height: Int!

    # Data
    dataQuery: String
    dataSource: DataSource
    data: JSON # Real-time data

    # Refresh
    refreshInterval: RefreshInterval
    lastRefreshedAt: DateTime

    # Drill-down
    drillDownEnabled: Boolean!
    drillDownTarget: Dashboard

    # Metadata
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  # ===================================================================
  # DATA SOURCES
  # ===================================================================

  type DataSource {
    id: ID!
    name: String!
    type: String! # postgresql, clickup, api, etc.
    description: String

    # Connection
    config: JSON!
    isConnected: Boolean!
    lastTestAt: DateTime
    lastTestStatus: String

    # Security
    encryptedCredentials: String
    sensitivity: SensitivityLevel

    # Usage
    dashboards: [Dashboard!]!
    widgets: [Widget!]!

    # Metadata
    createdAt: DateTime!
    updatedAt: DateTime!
    createdBy: User!
  }

  # ===================================================================
  # AUTHORIZATION
  # ===================================================================

  type Role {
    id: ID!
    organization: Organization
    name: String!
    description: String
    isSystem: Boolean!
    permissions: [String!]!
    memberCount: Int!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type ResourcePermission {
    id: ID!
    user: User
    role: Role
    resourceType: String!
    resourceId: ID!
    permissionLevel: PermissionLevel!
    source: String!
  }

  type ABACPolicy {
    id: ID!
    name: String!
    description: String
    resourceType: String!
    action: String!
    effect: String! # allow or deny
    conditions: JSON!
    priority: Int!
    isEnabled: Boolean!
    organization: Organization
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type DataMaskingRule {
    id: ID!
    name: String!
    description: String
    maskingType: MaskingType!
    config: JSON!
    bypassRoles: [Role!]!
    bypassUsers: [User!]!
    isEnabled: Boolean!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  # ===================================================================
  # QUERIES
  # ===================================================================

  type Query {
    # ===== Authentication & Users =====
    me: User
    user(id: ID!): User
    users(
      organizationId: ID
      search: String
      limit: Int = 50
      offset: Int = 0
    ): UserConnection!

    # ===== Organizations =====
    organization(id: ID!): Organization
    organizations(
      limit: Int = 50
      offset: Int = 0
    ): OrganizationConnection!
    myOrganizations: [Organization!]!

    # ===== Workspaces =====
    workspace(id: ID!): Workspace
    workspaces(
      organizationId: ID
      limit: Int = 50
      offset: Int = 0
    ): WorkspaceConnection!
    myWorkspaces: [Workspace!]!

    # ===== Dashboards =====
    dashboard(id: ID!): Dashboard
    dashboards(
      workspaceId: ID
      organizationId: ID
      search: String
      limit: Int = 50
      offset: Int = 0
    ): DashboardConnection!
    myDashboards: [Dashboard!]!
    recentDashboards(limit: Int = 10): [Dashboard!]!

    # ===== Widgets =====
    widget(id: ID!): Widget
    widgets(
      dashboardId: ID!
      limit: Int = 100
      offset: Int = 0
    ): [Widget!]!

    # ===== Data Sources =====
    dataSource(id: ID!): DataSource
    dataSources(
      organizationId: ID
      type: String
      limit: Int = 50
      offset: Int = 0
    ): DataSourceConnection!

    # ===== Authorization =====
    roles(organizationId: ID): [Role!]!
    role(id: ID!): Role
    abacPolicies(
      resourceType: String
      action: String
      limit: Int = 50
      offset: Int = 0
    ): [ABACPolicy!]!
    maskingRules(limit: Int = 50, offset: Int = 0): [DataMaskingRule!]!

    # ===== Data Queries =====
    executeQuery(
      dataSourceId: ID!
      query: String!
      parameters: JSON
    ): QueryResult!

    # ===== Analytics =====
    dashboardAnalytics(dashboardId: ID!): DashboardAnalytics!
    organizationAnalytics(organizationId: ID!): OrganizationAnalytics!
  }

  # ===================================================================
  # MUTATIONS
  # ===================================================================

  type Mutation {
    # ===== Authentication =====
    login(emailOrUsername: String!, password: String!): AuthPayload!
    register(
      email: String!
      username: String!
      password: String!
      firstName: String
      lastName: String
    ): AuthPayload!
    logout: Boolean!
    refreshToken(refreshToken: String!): AuthPayload!

    # ===== User Management =====
    updateProfile(
      firstName: String
      lastName: String
      avatar: Upload
      timezone: String
      locale: String
      preferences: JSON
    ): User!

    enableMfa: MfaSetup!
    confirmMfa(code: String!): Boolean!
    disableMfa(password: String!): Boolean!

    # ===== Organizations =====
    createOrganization(
      name: String!
      slug: String!
      planType: String = "free"
    ): Organization!

    updateOrganization(
      id: ID!
      name: String
      logoUrl: String
      primaryColor: String
      settings: JSON
    ): Organization!

    deleteOrganization(id: ID!): Boolean!

    inviteMember(
      organizationId: ID!
      email: String!
      role: UserRole = MEMBER
    ): OrganizationMembership!

    updateMemberRole(
      membershipId: ID!
      role: UserRole!
    ): OrganizationMembership!

    removeMember(membershipId: ID!): Boolean!

    # ===== Workspaces =====
    createWorkspace(
      name: String!
      description: String
      organizationId: ID
      icon: String
      color: String
    ): Workspace!

    updateWorkspace(
      id: ID!
      name: String
      description: String
      icon: String
      color: String
    ): Workspace!

    deleteWorkspace(id: ID!): Boolean!

    # ===== Dashboards =====
    createDashboard(
      workspaceId: ID!
      name: String!
      description: String
      theme: String
      refreshInterval: RefreshInterval
    ): Dashboard!

    updateDashboard(
      id: ID!
      name: String
      description: String
      layout: JSON
      settings: JSON
      theme: String
      refreshInterval: RefreshInterval
    ): Dashboard!

    deleteDashboard(id: ID!): Boolean!

    duplicateDashboard(id: ID!, name: String!): Dashboard!

    shareDashboard(
      id: ID!
      userId: ID!
      permissionLevel: PermissionLevel!
    ): ResourcePermission!

    # ===== Widgets =====
    createWidget(
      dashboardId: ID!
      type: WidgetType!
      title: String!
      config: JSON!
      x: Int!
      y: Int!
      width: Int!
      height: Int!
    ): Widget!

    updateWidget(
      id: ID!
      title: String
      config: JSON
      x: Int
      y: Int
      width: Int
      height: Int
      refreshInterval: RefreshInterval
    ): Widget!

    deleteWidget(id: ID!): Boolean!

    refreshWidget(id: ID!): Widget!

    # ===== Data Sources =====
    createDataSource(
      name: String!
      type: String!
      description: String
      config: JSON!
    ): DataSource!

    updateDataSource(
      id: ID!
      name: String
      description: String
      config: JSON
    ): DataSource!

    deleteDataSource(id: ID!): Boolean!

    testDataSource(id: ID!): DataSourceTestResult!

    # ===== Authorization =====
    createRole(
      organizationId: ID!
      name: String!
      description: String
      permissions: [String!]!
    ): Role!

    updateRole(
      id: ID!
      name: String
      description: String
      permissions: [String!]
    ): Role!

    deleteRole(id: ID!): Boolean!

    assignRole(userId: ID!, roleId: ID!, organizationId: ID!): Boolean!
    revokeRole(userId: ID!, roleId: ID!, organizationId: ID!): Boolean!

    createABACPolicy(
      name: String!
      resourceType: String!
      action: String!
      effect: String!
      conditions: JSON!
      priority: Int = 100
      organizationId: ID
    ): ABACPolicy!

    updateABACPolicy(
      id: ID!
      name: String
      conditions: JSON
      priority: Int
      isEnabled: Boolean
    ): ABACPolicy!

    deleteABACPolicy(id: ID!): Boolean!
  }

  # ===================================================================
  # SUBSCRIPTIONS
  # ===================================================================

  type Subscription {
    # Dashboard updates
    dashboardUpdated(dashboardId: ID!): Dashboard!
    widgetDataUpdated(widgetId: ID!): Widget!

    # Real-time data
    dataSourceUpdated(dataSourceId: ID!): DataSource!

    # Notifications
    userNotification(userId: ID!): Notification!

    # Collaboration
    dashboardViewing(dashboardId: ID!): DashboardViewer!
  }

  # ===================================================================
  # PAGINATION & CONNECTIONS
  # ===================================================================

  type PageInfo {
    hasNextPage: Boolean!
    hasPreviousPage: Boolean!
    total: Int!
  }

  type UserConnection {
    edges: [User!]!
    pageInfo: PageInfo!
  }

  type OrganizationConnection {
    edges: [Organization!]!
    pageInfo: PageInfo!
  }

  type WorkspaceConnection {
    edges: [Workspace!]!
    pageInfo: PageInfo!
  }

  type DashboardConnection {
    edges: [Dashboard!]!
    pageInfo: PageInfo!
  }

  type DataSourceConnection {
    edges: [DataSource!]!
    pageInfo: PageInfo!
  }

  # ===================================================================
  # UTILITY TYPES
  # ===================================================================

  type QueryResult {
    columns: [String!]!
    rows: [JSON!]!
    rowCount: Int!
    executionTime: Float!
  }

  type MfaSetup {
    secret: String!
    qrCodeUrl: String!
    backupCodes: [String!]!
  }

  type DataSourceTestResult {
    success: Boolean!
    message: String
    latency: Float
  }

  type DashboardAnalytics {
    viewCount: Int!
    uniqueViewers: Int!
    avgTimeOnDashboard: Float!
    lastViewedAt: DateTime
    popularWidgets: [Widget!]!
  }

  type OrganizationAnalytics {
    totalUsers: Int!
    activeUsers: Int!
    totalDashboards: Int!
    totalWorkspaces: Int!
    storageUsed: Float!
  }

  type Notification {
    id: ID!
    type: String!
    title: String!
    message: String!
    data: JSON
    read: Boolean!
    createdAt: DateTime!
  }

  type DashboardViewer {
    user: User!
    dashboardId: ID!
    joinedAt: DateTime!
  }
`;
