from setuptools import setup, find_packages

setup(
    name="personabench",
    version="0.1.0",
    description="Benchmark harness for evaluating AI personas across plan-act-react tasks",
    author="AI Safety Collective",
    packages=find_packages(),
    python_requires=">=3.9",
    install_requires=[
        "pydantic>=2.6,<3",
        "pyyaml>=6.0",
        "typing-extensions>=4.8"
    ],
)
