export class LoginRequest {
    login: string = '';
    password: string = '';
}

export class UserAuth {
    fullname!: string | null;
    token!: string | null;
    isSuccess: boolean = false;
    message: string = '';
}