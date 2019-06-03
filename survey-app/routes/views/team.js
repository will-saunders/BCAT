const keystone = require('keystone');

const Users = keystone.list('User').model;
const Roles = keystone.list('Role').model;

const teamInfoHelper = require('../teamInfo');

updateUser = async (userId, roleId, modules) => {
    const query = {'_id': userId};
    const update = {'assignedModules': modules, 'role': roleId !== "no-role" ? roleId : null};
    Users.findOneAndUpdate(query, update, {new: true}, (err, mods) => {
        if (err) {
            console.error(err);
        }

        return mods;
    });
};

createRoleMap = async() => {
    const roles = await Roles.find();

    const roleNames = {};

    for (let i = 0; i < roles.length; i++) {
        roleNames[roles[i]._id] = roles[i].name;
    }

    return roleNames;
};

exports = module.exports = async (req, res) => {
    const view = new keystone.View(req, res);
    const locals = res.locals;
    locals.section = 'team';

    view.on('post', async () => {
        if (!req.body.userId) {
            console.error("missing user");
            // TODO: in app error messages
        } else {
            const userId = req.body.userId;
            delete req.body.userId;

            let roleId = req.body.role;
            delete req.body.role;

            await updateUser(userId, roleId, Object.values(req.body));
        }
        res.redirect('back');
    });

    const modMap = await teamInfoHelper.createModuleMap();
    locals.modMap = modMap;

    const roleMap = await createRoleMap();
    locals.roleMap = roleMap;

    teamInfoHelper.getTeamById(req.user.team).then(async (team) => {
        locals.team = team;
        locals.isLeader = teamInfoHelper.isTeamLeader(team, req.user._id);
        locals.user = req.user;

        return await teamInfoHelper.getTeamMembers(team._id);
    }).then(async (members) => {
        const memberInfo = await teamInfoHelper.formatTeamMemberInfo(members, modMap);

        locals.members = memberInfo.members;
        locals.membersToModules = memberInfo.membersToModules;

        view.render('team');
    });
};
