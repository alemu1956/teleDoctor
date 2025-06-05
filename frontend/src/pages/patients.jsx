import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

function PatientsPage() {
    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        fetch('http://localhost:3001/api/patients')
            .then((response) => {
                if (!response.ok) {
                    throw new Error('Failed to fetch patients');
                }
                return response.json();
            })
            .then((data) => {
                setPatients(data);
                setLoading(false);
            })
            .catch((error) => {
                console.error('Error fetching patients:', error);
                setError(error.message);
                setLoading(false);
            });
    }, []);

    // Filtered patients based on search query
    const filteredPatients = patients.filter((patient) => {
        const query = searchQuery.toLowerCase();
        return (
            patient.name.toLowerCase().includes(query) ||
            patient.fyda_id.toLowerCase().includes(query)
        );
    });

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="text-indigo-600 text-2xl">Loading patients...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="text-red-600 text-2xl">{error}</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-indigo-600">Patients List</h1>
                <button
                    onClick={() => navigate('/dashboard')}
                    className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 transition"
                >
                    ← Back to Dashboard
                </button>
            </div>

            {/* Search input */}
            <div className="mb-6">
                <input
                    type="text"
                    placeholder="Search by name or FYDA ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full bg-white shadow-md rounded-lg overflow-hidden">
                    <thead className="bg-indigo-600 text-white">
                        <tr>
                            <th className="py-3 px-6">ID</th>
                            <th className="py-3 px-6">Name</th>
                            <th className="py-3 px-6">Gender</th>
                            <th className="py-3 px-6">Age</th>
                            <th className="py-3 px-6">Language</th>
                            <th className="py-3 px-6">Religion</th>
                            <th className="py-3 px-6">Medical History</th>
                            <th className="py-3 px-6">FYDA ID</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredPatients.map((patient) => (
                            <tr key={patient.id} className="border-b hover:bg-gray-50">
                                <td className="py-2 px-4 text-center">{patient.id}</td>
                                <td className="py-2 px-4">{patient.name}</td>
                                <td className="py-2 px-4">{patient.gender}</td>
                                <td className="py-2 px-4 text-center">{patient.age}</td>
                                <td className="py-2 px-4">{patient.language}</td>
                                <td className="py-2 px-4">{patient.religion}</td>
                                <td className="py-2 px-4">{patient.medical_history}</td>
                                <td className="py-2 px-4">{patient.fyda_id}</td>
                            </tr>
                        ))}
                        {filteredPatients.length === 0 && (
                            <tr>
                                <td colSpan="8" className="py-4 text-center text-gray-500">
                                    No patients found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default PatientsPage;