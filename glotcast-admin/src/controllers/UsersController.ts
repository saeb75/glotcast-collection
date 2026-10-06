import { getUser, listUsers, setFeatureAccess } from "@/api/users"
import { USERS } from "@/copy/users"
import { withData } from "@/domain/cache"
import { type UsersQuery, usersKey, usersRequest } from "@/domain/lists"
import { useUsersStore } from "@/stores/useUsersStore"
import { loadEntry, loadShown, runAction } from "./load"

const store = useUsersStore.getState
const MAX_AGE = 30_000

export class UsersController {
  static async load(query: UsersQuery, force = false): Promise<void> {
    const key = usersKey(query)
    await loadShown(
      () => store().pages[key],
      (e) => store().setPage(key, e),
      () => store().setShownKey(key),
      () => listUsers(usersRequest(query)),
      MAX_AGE,
      force,
    )
  }

  static async loadUser(id: string, force = false): Promise<void> {
    await loadEntry(
      () => store().details[id],
      (e) => store().setDetail(id, e),
      () => getUser(id),
      MAX_AGE,
      force,
    )
  }

  /** Grants or removes backend Pro. */
  static async setFeatureAccess(id: string, value: boolean): Promise<void> {
    if (store().saving[id]) return
    store().setSaving(id, true)
    try {
      const user = await runAction(
        () => setFeatureAccess(id, value),
        value ? USERS.detail.granted : USERS.detail.revoked,
      )
      if (user) {
        store().setDetail(id, withData(user))
        store().dropPages()
      }
    } finally {
      store().setSaving(id, false)
    }
  }

  static reset(): void {
    store().clear()
  }
}
