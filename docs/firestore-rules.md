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

    // Mirrors lib/allowedEmail.ts: Yale accounts, plus the creator's
    // personal Gmail so they can test with a separate account.
    function isAllowedUser() {
      return isAuthenticated() &&
             (request.auth.token.email.matches('.*@yale[.]edu') ||
              request.auth.token.email == 'filifonsecacagnazzo@gmail.com');
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

      allow update: if isAuthenticated() &&
                      resource.data.userId == request.auth.uid &&
                      request.resource.data.userId == resource.data.userId;

      allow delete: if isAuthenticated() &&
                      resource.data.userId == request.auth.uid;
    }

    // ============================================
    // FRIENDS PUBLIC DATA
    // Grades are NEVER stored here. Enabled profiles are discoverable
    // so Yalies can find each other in Friends search; full course lists
    // are only shown in-app after a friendship check on the profile page.
    // Discovery reads require a Yale (or creator) email: Firebase issues
    // tokens to any Google account, so isAuthenticated() alone is not
    // enough to keep non-Yale accounts out of direct Firestore reads.
    // ============================================
    match /friends_public_data/{userId} {
      allow read: if isOwner(userId) ||
                    (isAllowedUser() && resource.data.enabled == true);

      allow create, update: if isOwner(userId) &&
                              request.resource.data.userId == userId;

      allow delete: if isOwner(userId);
    }

    // ============================================
    // FRIENDS LOOKUP (for efficient rule checks)
    // ============================================
    match /friends_lookup/{friendshipId} {
      allow read: if isAuthenticated() &&
                    request.auth.uid in resource.data.users;

      // Friendship lookup docs must be created via Admin SDK / Cloud Function on accept.
      allow create: if false;

      allow delete: if isAuthenticated() &&
                      request.auth.uid in resource.data.users;

      allow update: if false;
    }

    // ============================================
    // USERS — owner only (emails, bio, private prefs)
    // Friend-facing profile fields live in friends_public_data.
    // ============================================
    match /users/{userId} {
      allow read, create, update, delete: if isOwner(userId);
    }

    // ============================================
    // FRIENDS (backward compatible)
    // ============================================
    match /friends/{friendId} {
      allow read, delete: if isAuthenticated() &&
                            request.auth.uid in resource.data.users;

      // Friendship docs must be created via Admin SDK / Cloud Function on accept.
      allow create: if false;

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

    match /conversations/{docId} {
      allow read, update, delete: if isAuthenticated() &&
                                    resource.data.userId == request.auth.uid;
      allow create: if isAuthenticated() &&
                      request.resource.data.userId == request.auth.uid;
    }

    // ============================================
    // SECRETS — Admin SDK only (client deny)
    // ============================================
    match /dan_keys/{userId} {
      allow read, write: if false;
    }

    match /mcp_tokens/{userId} {
      allow read, write: if false;
    }

    match /contact_messages/{docId} {
      allow read, write: if false;
    }

}
}
