"use client";

import Dashboard from "../../components/Dashboard";

export default function PioneerPage() {
    // Creating a VIP bypass badge that tricks the Firebase type-checker
    const mockUser = {
        uid: "pioneer-demo-agent-007",
        email: "noelah@baratrust.com",
    } as any;

    return (
        <Dashboard
            user={mockUser}
            onLogout={() => window.location.href = "/agents"}
        />
    );
}