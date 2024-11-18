import gql from "graphql-tag";
import { TrackDisplayType } from "./prisma/prisma-client";

// createTrack可能也不是回傳Track
// Track改為JournalTrack比較好
const typeDefs = gql`
  scalar Date
  scalar IntID
  enum TrackDisplayType {
    VALUE
    CHECK_BOX
  }

  # enum IconType {
  #   MOOD
  #   ACTIVITY
  # }

  type Query {
    "顯示單篇日記"
    readJournal(id: IntID!): ReadJournalResponse
    "顯示所有可選心情"
    getMoods: GetMoodsResponse
    getTracks(groupId: IntID!): GetTracksResponse
    getActivities(groupId: IntID!): GetActivitiesResponse
  }

  type GetMoodsResponse implements Response {
    data: [Mood!]
    code: Int!
    success: Boolean!
    message: String!
  }

  type GetActivitiesResponse implements Response {
    data: [Activity!]
    code: Int!
    success: Boolean!
    message: String!
  }

  type ReadJournalResponse implements Response {
    data: Journal
    code: Int!
    success: Boolean!
    message: String!
  }

  type Mutation {
    "create new group journal"
    addJournal(input: CreateJournalInput!): AddJournalResponse
    "updateJournal"
    updateJournal(input: UpdateJournalInput!): UpdateJournalResponse
    "remove self-created journal"
    removeJournal(id: IntID!): RemoveJournalResponse
    "create track in group"
    createTrack(input: CreateTrackInput!): CreateTrackResponse
    "remove track in group"
    removeTrack(id: IntID!): RemoveTrackResponse
    "create category"
    createCategory(input: CreateCategoryInput!): CreateCategoryResponse
    "remove category"
    removeCategory(input: RemoveCategoryInput!): RemoveCategoryResponse
    "新增活動"
    createActivity(input: CreateActivityInput!): CreateActivityResponse
    "更新活動"
    updateActivity(input: UpdateActivityInput!): UpdateActivityResponse
    "刪除活動"
    removeActivity(id: IntID!): RemoveActivityResponse
    "add track to journal"
    addJournalTrack(input: AddJournalTrackInput!): AddJournalTrackResponse
    "remove track from journal"
    removeJournalTrack(id: IntID!): RemoveJournalTrackResponse
  }

  interface Response {
    "Similar to HTTP status code, represents the status of the mutation"
    code: Int!
    "Indicates whether the mutation was successful"
    success: Boolean!
    "Human-readable message for the UI"
    message: String!
  }

  type TrackOption {
    id: IntID!
    trackName: String!
    trackDisplayType: TrackDisplayType!
  }

  type GetTracksResponse implements Response {
    data: [TrackOption!]
    code: Int!
    success: Boolean!
    message: String!
  }

  type AddJournalResponse implements Response {
    data: Journal
    code: Int!
    success: Boolean!
    message: String!
  }

  type CreateTrackResponse implements Response {
    data: Track
    code: Int!
    success: Boolean!
    message: String!
  }

  type CreateCategoryResponse implements Response {
    data: JournalCategory
    code: Int!
    success: Boolean!
    message: String!
  }

  type CreateActivityResponse implements Response {
    data: Activity
    code: Int!
    success: Boolean!
    message: String!
  }

  type UpdateActivityResponse implements Response {
    data: Activity
    code: Int!
    success: Boolean!
    message: String!
  }

  type UpdateJournalResponse implements Response {
    code: Int!
    success: Boolean!
    message: String!
  }

  type RemoveJournalResponse implements Response {
    data: Journal
    code: Int!
    success: Boolean!
    message: String!
  }

  type AddJournalTrackResponse implements Response {
    code: Int!
    success: Boolean!
    message: String!
    data: Track
  }

  type RemoveCategoryResponse implements Response {
    data: JournalCategory
    code: Int!
    success: Boolean!
    message: String!
  }

  type RemoveActivityResponse implements Response {
    data: Activity
    code: Int!
    success: Boolean!
    message: String!
  }

  type RemoveTrackResponse implements Response {
    data: Track
    code: Int!
    success: Boolean!
    message: String!
  }

  type RemoveJournalTrackResponse implements Response {
    code: Int!
    success: Boolean!
    message: String!
    data: Track
  }

  type PieChart {
    value: Int!
    name: String!
  }

  type BarChart {
    value: Int!
    name: String!
  }

  # TODO: 需要在resolver的地方針對不同chart撈資料

  type Chart {
    trackPieChart: PieChart
    journalMoodBarChart: [BarChart!]
    eventMoodBarChart: [BarChart!]
  }

  input CreateTrackInput {
    trackName: String!
    trackDisplayType: TrackDisplayType!
    groupId: IntID!
  }

  input UpdateJournalInput {
    id: IntID!
    moodId: IntID!
    categoryId: IntID
    # 日記最終的活動有哪些
    activities: [IntID!]!
    events: [UpdateJournalEventInput!]!
    journalTitle: String!
    journalDate: Date!
    journalBody: String!
    groupId: IntID!
  }

  input CreateJournalInput {
    journalTitle: String!
    journalDate: Date!
    journalBody: String
    moodId: IntID
    groupId: IntID!
    tracks: [JournalTrackInput!]
    activities: [IntID!]
    events: [CreateJournalEventInput!]
    categoryId: IntID
  }

  input JournalTrackInput {
    trackId: IntID!
    trackGoal: Int
    trackValue: Int!
  }

  input UpdateJournalEventInput {
    id: IntID
    eventTitle: String!
    eventBody: String!
    # eventIndex: Int!
    eventMoodId: IntID
  }

  input CreateJournalEventInput {
    eventTitle: String!
    eventBody: String!
    # eventIndex: Int!
    eventMoodId: IntID
    groupId: IntID
  }

  input CreateCategoryInput {
    categoryName: String!
    groupId: IntID!
  }

  input RemoveCategoryInput {
    id: IntID!
    groupId: IntID!
  }

  input CreateActivityInput {
    activityName: String!
    groupId: IntID!
    iconId: IntID!
  }

  input UpdateActivityInput {
    id: IntID!
    activityName: String!
    iconId: IntID!
  }

  input AddJournalTrackInput {
    journalId: IntID!
    trackId: IntID!
    trackGoal: Int!
    trackValue: Int!
  }

  type Icon {
    id: IntID!
    iconName: String!
    iconURL: String!
    # iconType: IconType!
  }

  type Mood {
    id: IntID!
    icon: Icon!
    moodName: String!
  }

  type Track {
    id: IntID!
    trackId: IntID!
    trackName: String!
    trackDisplayType: TrackDisplayType!
    trackGoal: Int
    trackValue: Int!
  }

  type Journal {
    id: IntID!
    journalTitle: String
    journalDate: Date
    journalMood: Mood
    journalBody: String
    category: JournalCategory
    # mood: Mood
    author: User
    tracks: [Track!]!
    activities: [Activity!]!
    events: [JournalEvent!]!
  }

  type JournalCategory {
    id: IntID!
    categoryName: String!
    group: Group!
  }

  type JournalEvent {
    id: IntID!
    eventTitle: String!
    eventBody: String!
    eventIndex: Int!
    eventMood: Mood
    group: Group
    mood: Mood
    # journal: Journal
  }

  # 有需要group?
  type Activity {
    id: IntID!
    activityName: String!
    icon: Icon
    group: Group!
  }

  type Group {
    id: IntID!
    groupName: String!
  }

  type User {
    id: IntID!
    userName: String!
  }
`;

export default typeDefs;
