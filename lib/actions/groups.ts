"use server"

import { redirect } from "next/navigation"
import { createAdminClient } from "@/lib/supabase/admin"
import { getSession } from "@/lib/auth/session"
import { createGroupSchema, addMemberSchema } from "@/lib/validation"
import type { ActionState } from "@/lib/actions/auth"

async function requireAuth() {
  const session = await getSession()
  if (!session) redirect("/auth/login")
  return session
}

export async function createGroupAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireAuth()
  const parsed = createGroupSchema.safeParse({ name: formData.get("name") })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid group name" }
  }

  const admin = createAdminClient()

  // Create the group
  const { data: group, error: groupError } = await admin
    .from("groups")
    .insert({
      name: parsed.data.name,
      creator_id: session.userId,
      invite_code: Math.random().toString(36).substring(2, 8).toUpperCase(),
    })
    .select("id")
    .single()

  if (groupError || !group) return { error: "Could not create group. Try again." }

  // Add the creator as the first member (admin role)
  await admin.from("group_members").insert({
    group_id: group.id,
    user_id: session.userId,
    role: "admin",
    status: "active",
  })

  // Create a group wallet
  await admin.from("group_wallets").insert({
    group_id: group.id,
    balance: 0,
  })

  redirect(`/dashboard/groups/${group.id}`)
}

export async function addMemberAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireAuth()
  const parsed = addMemberSchema.safeParse({
    groupId: formData.get("groupId"),
    phone: formData.get("phone"),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid details" }
  }

  const admin = createAdminClient()

  // Check if the current user is an admin of the group
  const { data: membership } = await admin
    .from("group_members")
    .select("role")
    .eq("group_id", parsed.data.groupId)
    .eq("user_id", session.userId)
    .single()

  if (membership?.role !== "admin") {
    return { error: "Only group admins can add members." }
  }

  // Find the user to add by phone number
  const { data: userToAdd } = await admin
    .from("profiles")
    .select("id")
    .eq("phone", parsed.data.phone)
    .maybeSingle()

  if (!userToAdd) {
    return { error: "No user found with this phone number. They must register first." }
  }

  // Check if they are already in the group
  const { data: existing } = await admin
    .from("group_members")
    .select("id")
    .eq("group_id", parsed.data.groupId)
    .eq("user_id", userToAdd.id)
    .maybeSingle()

  if (existing) {
    return { error: "User is already in this group." }
  }

  // Add the user to the group
  const { error } = await admin.from("group_members").insert({
    group_id: parsed.data.groupId,
    user_id: userToAdd.id,
    role: "member",
    status: "active",
  })

  if (error) return { error: "Could not add member. Try again." }

  return { success: true, message: "Member added successfully!" }
}

export async function removeMemberAction(groupId: string, userId: string): Promise<ActionState> {
  const session = await requireAuth()
  const admin = createAdminClient()

  // Check if current user is admin
  const { data: membership } = await admin
    .from("group_members")
    .select("role")
    .eq("group_id", groupId)
    .eq("user_id", session.userId)
    .single()

  if (membership?.role !== "admin") {
    return { error: "Only group admins can remove members." }
  }

  // Cannot remove yourself if you are the only admin (simplification)
  if (userId === session.userId) {
    return { error: "You cannot remove yourself." }
  }

  const { error } = await admin
    .from("group_members")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", userId)

  if (error) return { error: "Could not remove member." }

  return { success: true, message: "Member removed." }
}
