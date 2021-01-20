const settings = Game.serverSettings.cheatsAdmin
if (!settings) return

require('nh-admin')

Game.cheatsAdmin.owners = settings.admins