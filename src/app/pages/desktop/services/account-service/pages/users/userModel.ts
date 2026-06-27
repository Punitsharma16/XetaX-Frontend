export interface UserObject {
    id: ''; // UUID → string in Angular
    email: string;
    password: string;
    name: string;
    enable: boolean;
    isAdmin: boolean;
    parentId?: string; // optional if not always present
    createAt: string; // Instant → ISO string
    updateAt: string;
    company: string;
    phone?: string;
    provider: Provider;
}

export enum Provider {
    LOCAL = 'LOCAL',
    GOOGLE = 'GOOGLE',
    FACEBOOK = 'FACEBOOK'
}