rules_version = '2';
service cloud.firestore {
match /databases/{database}/documents {

    // ============================================
    // HELPER FUNCTIONS
    // ============================================

    function isAuthenticated() {
      return request.auth != null;
    }

    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }

    function getFriendshipId(uid1, uid2) {
      return uid1 < uid2 ? uid1 + '_' + uid2 : uid2 + '_' + uid1;
    }

    function areFriends(uid1, uid2) {
      return exists(/databases/$(database)/documents/friends_lookup/$(getFriendshipId(uid1, uid2)));
    }

    function hasFriendsEnabled(targetUserId) {
      let doc = get(/databases/$(database)/documents/friends_public_data/$(targetUserId));
      return doc != null && doc.data.enabled == true;
    }

    // ============================================
    // COURSES - LOCKED DOWN (owner only)
    // ============================================
    match /courses/{courseId} {
      // CRITICAL: Only the owner can read their own courses
      // This protects grades from being exposed
      allow read: if isAuthenticated() &&
                     resource.data.userId == request.auth.uid;

      allow create: if isAuthenticated() &&
                      request.resource.data.userId == request.auth.uid;

      allow update, delete: if isAuthenticated() &&
                              resource.data.userId == request.auth.uid;
    }

    // ============================================
    // FRIENDS PUBLIC DATA
    // ============================================
    match /friends_public_data/{userId} {
      // Owner can always read/write
      // Friends can read IF enabled AND actually friends
      allow read: if isOwner(userId) ||
                    (isAuthenticated() &&
                     hasFriendsEnabled(userId) &&
                     areFriends(request.auth.uid, userId));

      allow create, update: if isOwner(userId) &&
                              request.resource.data.userId == userId;

      allow delete: if isOwner(userId);
    }

    // ============================================
    // FRIENDS LOOKUP (for efficient rule checks)
    // ============================================
    match /friends_lookup/{friendshipId} {
      allow read: if isAuthenticated();

      allow create: if isAuthenticated() &&
                      request.auth.uid in request.resource.data.users;

      allow delete: if isAuthenticated() &&
                      request.auth.uid in resource.data.users;

      allow update: if false;
    }

    // ============================================
    // USERS
    // ============================================
    match /users/{userId} {
      allow read: if isAuthenticated();
      allow create, update, delete: if isOwner(userId);
    }

    // ============================================
    // FRIENDS (backward compatible)
    // ============================================
    match /friends/{friendId} {
      allow read, delete: if isAuthenticated() &&
                            request.auth.uid in resource.data.users;

      allow create: if isAuthenticated() &&
                      request.auth.uid in request.resource.data.users;

      allow update: if false;
    }

    // ============================================
    // FRIEND REQUESTS
    // ============================================
    match /friend-requests/{requestId} {
      allow read, delete: if isAuthenticated() &&
                            (resource.data.from == request.auth.uid ||
                             resource.data.to == request.auth.uid);

      allow create: if isAuthenticated() &&
                      request.resource.data.from == request.auth.uid;

      allow update: if isAuthenticated() &&
                      resource.data.to == request.auth.uid;
    }

    // ============================================
    // AI COLLECTIONS
    // ============================================
    match /ai_responses/{docId} {
      allow create: if isAuthenticated() &&
                      request.resource.data.userId == request.auth.uid;

      allow read, update, delete: if isAuthenticated() &&
                                    resource.data.userId == request.auth.uid;
    }

    match /cleoai_conversations/{userId} {
      allow read, write: if isOwner(userId);
    }

}
}
