import {
    Octokit
} from '@octokit/core';
import fs from 'fs';

const octokit = new Octokit({
    auth: process.argv[2]
});
const orgName = 'company'

async function getOrgUsers() {
    const org = await octokit.request('GET /orgs/{org}', {
        org: orgName
    });
    let githubUsersList = [];
    console.log('Seats: ' + org.data.plan.filled_seats);
    const ghpages = Math.ceil(org.data.plan.filled_seats / 100);
    for (let i = 0; i < ghpages; i++) {
        const githubUsers = await octokit.request('GET /orgs/{org}/members', {
            org: orgName,
            per_page: 100,
            page: i + 1
        });
        githubUsersList = githubUsersList.concat(githubUsers.data);
    }
    console.log('Employees: ' + githubUsersList.length);
    return githubUsersList;
}

async function getOrgPendingInvitations() {
    const githubUsers = await octokit.request('GET /orgs/{org}/invitations', {
        org: orgName,
        per_page: 100
    })
    return githubUsers.data;
}

async function sendOrgInvitation(id) {
    const invite = await octokit.request('POST /orgs/{org}/invitations', {
        org: orgName,
        invitee_id: id
    })
    return invite.data;
}

async function removeOrgUser(username) {
    const response = await octokit.request('DELETE /orgs/{org}/members/{username}', {
        org: orgName,
        username: username
    })
    return response.data;
}

async function getUser(username) {
    const user = await octokit.request('GET /users/{username}', {
        username: username
    })
    return user.data;
}

async function getOrgTeams() {
    const teams = await octokit.request('GET /orgs/{org}/teams', {
        org: orgName,
        per_page: 100
    })
    return teams.data;
}

async function getOrgTeam(name) {
    const team = await octokit.request('GET /orgs/{org}/teams/{team_slug}', {
        org: orgName,
        team_slug: name
    })
    return team.data;
}

async function createOrgTeam(name, description, parent_team_id) {
    const team = await octokit.request('POST /orgs/{org}/teams', {
        org: orgName,
        name,
        privacy: 'closed',
        description,
        parent_team_id
    })
    return team.data;
}

async function removeOrgTeam(team_slug) {
    const response = await octokit.request('DELETE /orgs/{org}/teams/{team_slug}', {
        org: orgName,
        team_slug
    })
    return response.data;
}

async function updateOrgTeam(name, description, parent_team_id) {
    const team = await octokit.request('PATCH /orgs/{org}/teams/{team_slug}', {
        org: orgName,
        name,
        team_slug: name,
        privacy: 'closed',
        description,
        parent_team_id
    })
    return team.data;
}

async function addMemberToTeam(username, team_slug) {
    const response = await octokit.request('PUT /orgs/{org}/teams/{team_slug}/memberships/{username}', {
        org: orgName,
        team_slug,
        username,
        role: 'member'
    });
    return response.data;
}

async function listTeamMembers(team_slug) {
    const response = await octokit.request('GET /orgs/{org}/teams/{team_slug}/members', {
        org: orgName,
        team_slug
    });
    return response.data;
}

async function removeTeamMember(username, team_slug) {
    const response = await octokit.request('DELETE /orgs/{org}/teams/{team_slug}/memberships/{username}', {
        org: orgName,
        team_slug,
        username
    });
    return response.data;
}

try {
    // USERS
    const employees = JSON.parse(fs.readFileSync('active.json', 'utf8'));
    let gitHubUsersList = await getOrgUsers();
    const gitHubPendingInvitationList = await getOrgPendingInvitations();
    gitHubUsersList = gitHubUsersList.concat(gitHubPendingInvitationList);
    const gitHubUsersToAdd = [];
    employees.active.map(employee => {
        if (employee.github_username !== '') {
            // Adding members to each team excluding employees team
            const employeeTeams = employee.permissions.split(',');
            employeeTeams.map(team => {
                if (team !== '' && team.toLowerCase() !== 'employees') {
                    addMemberToTeam(employee.github_username, team.toLowerCase()).then(() => {
                        console.log(`User added to ${team.toLowerCase()} team: ${employee.github_username}`);
                    });
                }
            });
            let isAdded = false;
            gitHubUsersList.map(user => {
                if (employee.github_username === user.login) {
                    isAdded = true;
                }
            });
            if (!isAdded) {
                gitHubUsersToAdd.push(employee);
            }
        }
    });
    gitHubUsersToAdd.map(employee => {
        if (employee.github_username !== '') {
            console.log('User to add - Name: ' + employee.first_name + ' ' + employee.last_name);
            getUser(employee.github_username).then(user => {
                sendOrgInvitation(user.id).then(() => {
                    console.log(`User invited: ${employee.github_username}`);
                });
            });
        }
    });
    let gitHubUsersToRemove = [];
    gitHubUsersList.map(user => {
        let removeUser = true;
        employees.active.map(employee => {
            if (employee.github_username === user.login) {
                removeUser = false;
                // Adding member to employees team
                addMemberToTeam(user.login, 'employees').then(() => {
                    console.log(`User added to employees team: ${employee.github_username}`);
                });
            }
        });
        if (removeUser) {
            gitHubUsersToRemove.push(user);
        }
    });
    // Don't remove invited members
    gitHubUsersToRemove = gitHubUsersToRemove.filter((username) => {
        return !gitHubPendingInvitationList.includes(username);
    });
    gitHubUsersToRemove.map(user => {
        removeOrgUser(user.login).then(() => {
            console.log('Remove: ' + user.login);
        })
    });

    // TEAMS
    const permissions = JSON.parse(fs.readFileSync('permissions.json', 'utf8'));
    const gitHubTeams = await getOrgTeams();
    gitHubTeams.map(gitHubTeam => {
        let removeTeam = true;
        permissions.teams.map(team => {
            if (gitHubTeam.name === team.name) {
                removeTeam = false;
            }
        });
        if (removeTeam) {
            removeOrgTeam(gitHubTeam.name).then(() => {
                console.log(`Team removed: ${gitHubTeam.name}`);
            })
        }
    });
    permissions.teams.map(team => {
        let createTeam = true;
        gitHubTeams.map(gitHubTeam => {
            if (gitHubTeam.name === team.name) {
                createTeam = false;
                // Check parent & update team info like name and description
                if (team.parent) {
                    getOrgTeam(team.parent).then(parent => {
                        updateOrgTeam(team.name, team.description, parent.id).then(() => {
                            console.log(`Team updated: ${team.name}`);
                        });
                    });
                } else {
                    updateOrgTeam(team.name, team.description, null).then(() => {
                        console.log(`Team updated: ${team.name}`);
                    });
                }
            }
        });
        if (createTeam && team.parent) {
            getOrgTeam(team.parent).then(parent => {
                createOrgTeam(team.name, team.description, parent.id).then(() => {
                    console.log(`Team created: ${team.name}`);
                });
            })
        }
        // Removing members from teams
        if (!createTeam && team.name !== 'employees') {
            listTeamMembers(team.name).then(response => {
                const members = [];
                response.map(member => {
                    members.push(member.login);
                });
                employees.active.map(employee => {
                    if (!employee.permissions.toLowerCase().includes(team.name)) {
                        if (members.includes(employee.github_username)) {
                            removeTeamMember(employee.github_username, team.name).then(() => {
                                console.log(`User removed from ${team.name} team: ${employee.github_username}`);
                            });
                        }
                    }
                });
            });
        }
    });
} catch (err) {
    console.error(err);
}
