export interface ProfileUpdate {
    email: string;
    login: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    address: string;
}

export interface PasswordUpdate {
    oldPassword: string;
    newPassword: string;
}
