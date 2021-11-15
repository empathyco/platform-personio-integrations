import {
    gmail_v1,
    google
} from 'googleapis';
import fs from 'fs';
import Mustache from 'mustache';
import nodemailer from "nodemailer";

const serviceAccountEmail = 'user-service-account@company.com';
const customer = 'C12abcdef';
const companyName = 'Company';

const auth = new google.auth.JWT({
    keyFile: './credentials.json',
    scopes: [
        'https://www.googleapis.com/auth/admin.directory.user',
        'https://www.googleapis.com/auth/admin.directory.group'
    ],
    subject: serviceAccountEmail,
});
const admin = google.admin({
    version: 'directory_v1',
    auth
});

async function listUsers() {
    const response = await admin.users.list({
        customer,
        maxResults: 500,
        orderBy: 'email',
    })
    return response.data.users;
}

async function listUserAliases(email) {
    const response = await admin.users.aliases.list({
        userKey: email
    });
    return response.data.aliases;
}

async function listUserGroups(email) {
    const response = await admin.groups.list({
        userKey: email
    });
    return response.data.groups;
}

async function isUserMemberOfGroup(user, group) {
    const response = await admin.members.hasMember({
        groupKey: group,
        memberKey: user
    });
    return response.data.isMember;
}

function updateUser(user, isSuspended) {
    admin.users.update({
        userKey: user.primaryEmail,
        resource: user
    }, (err, res) => {
        if (err) return console.error(`${user.primaryEmail} - The API returned an error:`, err.message);
        if (isSuspended) {
            listUserGroups(user.primaryEmail).then(groups => {
                const groupsList = [];
                if (groups) {
                    groups.map(item => {
                        groupsList.push(item.email);
                    })
                }
                groupsList.map((group) => {
                    if (group !== "") {
                        deleteUserGroup(user.primaryEmail, group);
                    }
                });
            });
            console.log(`User suspended: ${user.primaryEmail}`);
        } else {
            if (user.aliases.length > 0) {
                listUserAliases(user.primaryEmail).then(aliases => {
                    const aliasesList = [];
                    if (aliases) {
                        aliases.map(item => {
                            aliasesList.push(item.alias);
                        })
                    }
                    aliasesList.map((alias) => {
                        if (!user.aliases.includes(alias)) {
                            deleteUserAlias(user.primaryEmail, alias);
                        }
                    });
                    user.aliases.map((alias) => {
                        if (!aliasesList.includes(alias) && alias !== "") {
                            createUserAliases(user.primaryEmail, alias);
                        }
                    });
                });
            }
            if (user.groups.length > 0) {
                user.groups.map((group) => {
                    if (group !== "") {
                        isUserMemberOfGroup(user.primaryEmail, group).then(isMember => {
                            if (!isMember) {
                                addUserToGroup(user.primaryEmail, group);
                            }
                        })
                    }
                });
            }
            listUserGroups(user.primaryEmail).then(groups => {
                const groupsList = [];
                if (groups) {
                    groups.map(item => {
                        groupsList.push(item.email);
                    })
                }
                groupsList.map((group) => {
                    if (!user.groups.includes(group) && group !== "") {
                        deleteUserGroup(user.primaryEmail, group);
                    }
                });
            });
            console.log(`User updated: ${user.primaryEmail}`);
        }
    });
}

function createUser(user) {
    admin.users.insert({
        resource: user
    }, (err, res) => {
        if (err) return console.error('The API returned an error:', err.message);
        if (user.aliases && user.aliases.length > 0) {
            user.aliases.map((alias) => {
                createUserAliases(user.primaryEmail, alias);
            });
        }
        if (user.groups && user.groups.length > 0) {
            user.groups.map((group) => {
                addUserToGroup(user.primaryEmail, group);
            });
        }
        console.log(`User created: ${user.primaryEmail}`);

        // Send welcome email
        sendWelcomeEmail(user);
    });
}

function createUserAliases(email, alias) {
    admin.users.aliases.insert({
        userKey: email,
        resource: {
            primaryEmail: email,
            alias
        }
    }, (err, res) => {
        if (err) return console.error('The API returned an error:', err.message);
        console.log(`User alias ${alias} created for ${email}`);
    });
}

function deleteUserAlias(email, alias) {
    admin.users.aliases.delete({
        userKey: email,
        alias
    }, (err, res) => {
        if (err) return console.error('The API returned an error:', err.message);
        console.log(`User alias ${alias} deleted for ${email}`);
    });
}

function deleteUserGroup(email, group) {
    admin.members.delete({
        groupKey: group,
        memberKey: email
    }, (err, res) => {
        if (err) return console.error('The API returned an error:', err.message);
        console.log(`User group ${group} membership deleted for ${email}`);
    });
}

function addUserToGroup(user, group) {
    admin.members.insert({
        groupKey: group,
        resource: {
            email: user,
            role: 'MEMBER',
            type: 'USER'
        }
    }, (err, res) => {
        if (err) return console.error('The API returned an error:', err.message);
        console.log(`User ${user} added to group ${group}`);
    });
}

function sendWelcomeEmail(user) {
    const emailHTML = fs.readFileSync('welcome-email.html', 'utf8');
    var args = process.argv.slice(2);
    let transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 587,
        secure: false, // true for 465, false for other ports
        auth: {
            user: args[0],
            pass: args[1],
        },
    });
    const html = Mustache.render(emailHTML, {
        name: user.name.givenName,
        email: user.primaryEmail,
        password: user.password
    });
    transporter.sendMail({
        from: `Human Resources <${emailSender}>`,
        to: user.recoveryEmail,
        subject: `Welcome To ${companyName}!`,
        html,
    }).then(() => {
        console.log("Message sent to new user: %s", user.primaryEmail);
    });
}

async function updateGmailSignature(employee) {
    const authClient = new google.auth.JWT({
        keyFile: 'credentials.json',
        scopes: [
            'https://www.googleapis.com/auth/gmail.settings.basic',
            'https://www.googleapis.com/auth/gmail.settings.sharing'
        ],
        subject: employee.email
    });
    await authClient.authorize();
    const gmail = new gmail_v1.Gmail({
        auth: authClient
    });
    const signatureHTML = fs.readFileSync('email-signature.html', 'utf8');
    const html = Mustache.render(signatureHTML, {
        name: `${employee.first_name} ${employee.last_name}`,
        email: employee.email,
        job_title: employee.job_title
    });
    const result = await gmail.users.settings.sendAs.update({
        userId: "me",
        sendAsEmail: employee.email,
        resource: {
            signature: html
        }
    });
    console.log(`GMAIL signature updated for user ${employee.email}`)
    return result;
}

try {
    const employees = JSON.parse(fs.readFileSync('active.json', 'utf8'));
    const employeesEmails = [];
    employees.active.map(employee => {
        employeesEmails.push(employee.email);
    });
    listUsers().then(users => {
        // Suspend users
        const usersToSuspendList = users.filter((user) => !employeesEmails.includes(user.primaryEmail) && !user.suspended && user.orgUnitPath === '/employees');
        usersToSuspendList.map(user => {
            user.suspended = true;
            updateUser(user, true);
        });
        // Create users
        const usersEmails = [];
        users.map(user => {
            usersEmails.push(user.primaryEmail);
        });
        const usersToCreateList = employeesEmails.filter((employee) => !usersEmails.includes(employee));
        usersToCreateList.map(email => {
            // Get user data from Personio
            const userToCreate = employees.active.filter(employee => {
                return employee.email === email
            })
            // Generate password suffix
            const characters = '@#$%&+-=';
            let passwordSuffix = '';
            for (let i = 0; i < 3; i++) {
                passwordSuffix += characters.charAt(Math.floor(Math.random() * characters.length));
            }
            // Create user
            const user = {
                primaryEmail: userToCreate[0].email,
                password: `${companyName}${new Date().getFullYear()}${passwordSuffix}`,
                name: {
                    familyName: userToCreate[0].last_name,
                    givenName: userToCreate[0].first_name
                },
                organizations: [{
                    title: userToCreate[0].job_title,
                    name: companyName,
                    primary: true,
                    type: "work"
                }],
                changePasswordAtNextLogin: true,
                aliases: userToCreate[0].aliases.split(',')[0] === "" ? null : userToCreate[0].aliases.split(','),
                groups: userToCreate[0].distribution_lists.split(',')[0] === "" ? null : userToCreate[0].distribution_lists.split(','),
                orgUnitPath: "/employees",
                recoveryEmail: userToCreate[0].personal_email
            }
            createUser(user);
        });
        // Wait until all new users are created to update email signature and users
        setTimeout(() => {
            employees.active.map(employee => {
                // Update signatures of each employee
                updateGmailSignature(employee);
                // Update users
                const user = {
                    primaryEmail: employee.email,
                    name: {
                        familyName: employee.last_name,
                        givenName: employee.first_name
                    },
                    organizations: [{
                        title: employee.job_title,
                        name: companyName,
                        primary: true,
                        type: "work"
                    }],
                    aliases: employee.aliases.split(','),
                    groups: employee.distribution_lists.split(','),
                    orgUnitPath: "/employees",
                    recoveryEmail: employee.personal_email === '' ? null : employee.personal_email
                }
                updateUser(user, false);
            });
        }, 20000);
    });
} catch (err) {
    console.error(err);
}
