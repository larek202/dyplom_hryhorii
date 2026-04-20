export {
  setCredentials,
  logout,
  setAuthError,
  setLoading,
  updateUser,
  promoteToOrganizer,
  default as authReducer,
} from './authSlice';

export {
  authApi,
  useRegisterMutation,
  useLoginMutation,
  useGetMeQuery,
  useUpdateProfileMutation,
  useChangePasswordMutation,
  useUpdateNotificationsMutation,
} from './api';




