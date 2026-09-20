// Local Cedar policy mirror for ShikshaMesh authorization.
// The TypeScript policy remains the production fail-closed enforcement point;
// this policy is evaluated in CI/local development to prevent policy drift.

permit(principal, action, resource) when { principal.role == "admin" };
permit(principal, action == Action::"search_web", resource);
permit(principal, action == Action::"read_marks", resource) when { principal.id == resource.ownerId };
permit(principal, action == Action::"read_profile", resource) when { principal.id == resource.ownerId };
permit(principal, action == Action::"read_marks", resource) when {
  principal.role == "teacher" && principal.classIds.contains(resource.classId)
};
permit(principal, action == Action::"read_profile", resource) when {
  principal.role == "teacher" && principal.classIds.contains(resource.classId)
};
