"""PySpark processor for large-scale dataset processing."""
from typing import Any


class PySparkProcessor:
    """
    PySpark-based processor for datasets too large for in-memory Pandas.
    Lazily imports PySpark so the rest of the framework works without it.
    """

    def __init__(self, app_name: str = "DataVizAIStudio", master: str = "local[*]"):
        self.app_name = app_name
        self.master = master
        self._spark = None

    @property
    def spark(self):
        if self._spark is None:
            from pyspark.sql import SparkSession
            self._spark = (
                SparkSession.builder
                .appName(self.app_name)
                .master(self.master)
                .config("spark.sql.execution.arrow.pyspark.enabled", "true")
                .getOrCreate()
            )
            self._spark.sparkContext.setLogLevel("ERROR")
        return self._spark

    def load(self, data_path: str, schema: dict[str, Any] | None = None):
        """Load a CSV or Parquet file into a Spark DataFrame."""
        from pyspark.sql import functions as F

        path = data_path.lower()
        if path.endswith(".csv"):
            sdf = self.spark.read.option("header", "true").option("inferSchema", "true").csv(data_path)
        elif path.endswith(".parquet"):
            sdf = self.spark.read.parquet(data_path)
        elif path.endswith(".json"):
            sdf = self.spark.read.json(data_path)
        else:
            raise ValueError(f"Unsupported file format for PySpark loader: {data_path}")

        return sdf

    def profile(self, sdf) -> dict[str, Any]:
        """Return basic statistics for a Spark DataFrame."""
        row_count = sdf.count()
        stats = sdf.describe().toPandas().to_dict(orient="records")
        return {"row_count": row_count, "spark_describe": stats}

    def to_pandas(self, sdf, limit: int = 100_000):
        """Convert a Spark DataFrame to Pandas (with a row limit for safety)."""
        return sdf.limit(limit).toPandas()

    def stop(self):
        if self._spark:
            self._spark.stop()
            self._spark = None
