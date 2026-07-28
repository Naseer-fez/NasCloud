export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
export const FRONTEND_URL = import.meta.env.VITE_FRONTEND_URL || window.location.origin;
export const DOWNLOAD_SETUP_URL = import.meta.env.VITE_DOWNLOAD_SETUP_URL || 'https://github.com/Naseer-fez/NasCloud-Backend/releases/download/v1.0.2/NasCloudSetup.exe';
export const DOWNLOAD_SERVER_URL = import.meta.env.VITE_DOWNLOAD_SERVER_URL || 'https://github.com/Naseer-fez/NasCloud-Backend/releases/download/v1.0.2/NasCloudServer.exe';
export const DOWNLOAD_ZIP_URL = import.meta.env.VITE_DOWNLOAD_ZIP_URL || 'https://github.com/Naseer-fez/NasCloud-Backend/releases/download/v1.0.2/NasCloud.zip';
export const GITHUB_URL = import.meta.env.VITE_GITHUB_URL || 'https://github.com/Naseer-fez/NasCloud-Backend';

// localStorage key constants
export const CLIENT_BACKEND_URL_KEY = 'client_backend_url';
export const ALLOW_USERS_KEY = 'allow_users';
export const AUTH_TOKEN_KEY = 'token';
export const AUTH_USER_ID_KEY = 'userid';
export const MAIN_USERNAME_KEY = 'main_username';
export const MAIN_PASSWORD_KEY = 'main_password';
export const MAIN_API_KEY_STORAGE = 'main_api_key';
export const MAIN_ACCESS_CODE_KEY = 'main_access_code';
export const MAIN_TOKEN_KEY = 'main_token';
export const STRUCTURE_CACHE_KEY = 'structure_cache';
export const HOME_FOLDERS_CACHE_KEY = 'home_folders_cache';
export const STORAGE_STATS_CACHE_KEY = 'storage_stats_cache';
export const FOLDER_COUNT_CACHE_KEY = 'folder_count_cache';
export const HOME_FOLDERS_CACHE_LIMIT = 20000;
export const FILE_FOLDER_CACHE_TTL_MS = 30000;

// App refresh event constants
export const DRIVE_REFRESH_EVENT = 'nascloud-refresh';
export const SIDEBAR_REFRESH_EVENT = 'nascloud-sidebar-refresh';

// Default user ID for single-user mode (no client registration)
export const SINGLE_USER_ID = 0;
