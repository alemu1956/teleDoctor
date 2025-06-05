import React from 'react';

export default function App() {
    return (
        <div className="container mt-5">
            <div className="alert alert-success">
                <h1>Bootstrap is Working!</h1>
                <button className="btn btn-primary mt-3">
                    Test Bootstrap Button
                </button>

                <div className="mt-4 card">
                    <div className="card-body">
                        <h5 className="card-title">Card Title</h5>
                        <p className="card-text">This confirms Bootstrap styling is applied</p>
                    </div>
                </div>
            </div>
        </div>
    );
}