import fetch from 'node-fetch';
import fs from 'fs';

function getToken() {
    return new Promise(resolve => {
        const url = `https://api.personio.de/v1/auth?client_id=${process.argv[2]}&client_secret=${process.argv[3]}`;
        const options = {
            method: 'POST',
            headers: {
                Accept: 'application/json'
            }
        };

        fetch(url, options)
            .then(res => res.json())
            .then(json => {
                resolve(json.data.token);
            })
            .catch(err => console.error('error:' + err));
    })
}

async function getEmployees(page) {
    const offset = page * 200;
    const token = await getToken();
    return new Promise(resolve => {
        const url = `https://api.personio.de/v1/company/employees?limit=200&offset=${offset}`;
        const options = {
            method: 'GET',
            headers: {
                Accept: 'application/json',
                Authorization: `Bearer ${token}`
            }
        };

        fetch(url, options)
            .then(res => res.json())
            .then(json => {
                resolve(json);
            })
            .catch(err => console.error('error:' + err));
    });
}

function writeFile(list, type) {
    const filteredList = list.filter(employee => employee.attributes.status.value === type);
    const file = fs.createWriteStream(`${type}.json`);
    file.on('error', (err) => {
        console.log(err);
    });
    const sortedList = [];
    filteredList.map(employee => {
        const user = {
            "first_name": employee.attributes.first_name.value,
            "last_name": employee.attributes.last_name.value,
            "github_username": employee.attributes.dynamic_2441705.value,
            "distribution_lists": employee.attributes.dynamic_2917221.value,
            "personal_email": employee.attributes.dynamic_1272894.value,
            "job_title": employee.attributes.dynamic_3091326.value,
            "email": employee.attributes.email.value,
            "permissions": employee.attributes.dynamic_2943947.value,
            "aliases": employee.attributes.dynamic_3026824.value
        }
        sortedList.push(user);
        sortedList.sort((a, b) => (a.first_name > b.first_name) ? 1 : ((b.first_name > a.first_name) ? -1 : 0))
    });
    file.write(JSON.stringify({
        [type]: sortedList
    }, null, 2));
    file.end();
}

let employees = await getEmployees(0);
const employeesNumber = employees.metadata.total_elements;
let employeesList = [];

const pages = Math.ceil(employeesNumber / 200);
for (let i = 0; i < pages; i++) {
    employees = await getEmployees(i);
    employeesList = employeesList.concat(employees.data);
}

writeFile(employeesList, 'active');
writeFile(employeesList, 'inactive');
writeFile(employeesList, 'onboarding');
